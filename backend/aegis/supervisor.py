from __future__ import annotations
import json
import logging
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import yaml

from backend.aegis.store import ReadOnlyStore
from backend.aegis.rules import (
    check_unauthorised_retrieval,
    check_unauthorised_tool,
    check_execution_loop,
    check_token_spike,
    check_silent_failure,
    check_prompt_injection,
    check_heartbeat_timeout,
)
from backend.app.db import get_db_connection
from backend.app.sse import sse_manager

logger = logging.getLogger("agenttower.aegis")
CONFIG_PATH = Path(__file__).resolve().parent.parent.parent / "config" / "aegis.yaml"


class AegisSupervisor:
    """Read-only autonomous supervisor for runtime agent governance."""

    def __init__(self, store: Optional[ReadOnlyStore] = None, config_path: Path = CONFIG_PATH):
        self.store = store or ReadOnlyStore()
        self.config_path = config_path
        self._config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        if not self.config_path.exists():
            return {}
        with open(self.config_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def reload_config(self) -> None:
        self._config = self._load_config()

    async def evaluate_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluates an incoming canonical event against all active AEGIS supervisory rules."""
        incidents: List[Dict[str, Any]] = []
        agent_id = event.get("agent_id")
        if not agent_id:
            return incidents

        agent_config = await self.store.get_agent_config(agent_id)
        if not agent_config:
            return incidents

        rules_cfg = self._config.get("rules", {})

        # 1. Unauthorised retrieval
        if rules_cfg.get("unauthorised_retrieval", {}).get("enabled", True):
            inc = check_unauthorised_retrieval(event, agent_config)
            if inc:
                incidents.append(inc)

        # 2. Unauthorised tool use
        if rules_cfg.get("unauthorised_tool_use", {}).get("enabled", True):
            inc = check_unauthorised_tool(event, agent_config)
            if inc:
                incidents.append(inc)

        # 3. Prompt injection indicator
        if rules_cfg.get("prompt_injection_indicator", {}).get("enabled", True):
            patterns = rules_cfg.get("prompt_injection_indicator", {}).get("patterns", [])
            thresh = rules_cfg.get("prompt_injection_indicator", {}).get("confidence_threshold", 0.60)
            inc = check_prompt_injection(event, patterns, thresh)
            if inc:
                incidents.append(inc)

        # 4. Execution loop
        if rules_cfg.get("execution_loop", {}).get("enabled", True) and event.get("event_type") == "tool_call":
            max_n = rules_cfg.get("execution_loop", {}).get("max_identical_tool_calls_n", 3)
            win_t = rules_cfg.get("execution_loop", {}).get("window_seconds_t", 120)
            recent_tools = await self.store.get_recent_tool_events(agent_id, limit=15)
            combined = [event] + [e for e in recent_tools if e.get("event_id") != event.get("event_id")]
            inc = check_execution_loop(combined, max_repeats=max_n, window_seconds=win_t)
            if inc:
                incidents.append(inc)

        # 5. Token spike and silent failure on run_end
        if event.get("event_type") == "run_end":
            run_id = event.get("run_id")
            if run_id:
                run_events = await self.store.get_run_events(run_id)
                # Check silent failure
                if rules_cfg.get("heartbeat_and_silent_failure", {}).get("enabled", True):
                    inc = check_silent_failure(run_events)
                    if inc:
                        incidents.append(inc)

                # Check token spike
                if rules_cfg.get("token_and_cost_spike", {}).get("enabled", True):
                    history = await self.store.get_historical_run_token_usage(agent_id, limit=30)
                    sigma_k = rules_cfg.get("token_and_cost_spike", {}).get("sigma_multiplier_k", 2.0)
                    min_samples = rules_cfg.get("token_and_cost_spike", {}).get("min_sample_size_for_sigma", 5)
                    inc = check_token_spike(run_events, agent_config, history, sigma_k=sigma_k, min_sample_size=min_samples)
                    if inc:
                        incidents.append(inc)

        # Save and publish non-duplicate incidents
        new_incidents = []
        if incidents:
            active_keys = await self.store.get_active_incident_keys()
            for inc in incidents:
                key = f"{inc['agent_id']}:{inc['rule_id']}"
                if key not in active_keys:
                    await self._persist_incident(inc)
                    new_incidents.append(inc)
                    await sse_manager.broadcast("incident_raised", inc)

        return new_incidents

    async def check_all_agent_heartbeats(self) -> List[Dict[str, Any]]:
        """Periodically checks all registered agents for missed heartbeats."""
        rules_cfg = self._config.get("rules", {}).get("heartbeat_and_silent_failure", {})
        if not rules_cfg.get("enabled", True):
            return []

        mult_k = rules_cfg.get("heartbeat_miss_multiplier_k", 2.5)
        now = datetime.datetime.now(datetime.timezone.utc)
        raised = []

        async with get_db_connection() as conn:
            cursor = await conn.execute("SELECT * FROM agent_state")
            rows = await cursor.fetchall()

        for r in rows:
            cfg = {
                "agent_id": r["agent_id"],
                "last_heartbeat": r["last_heartbeat"],
                "heartbeat_interval_s": r["heartbeat_interval_s"]
            }
            inc = check_heartbeat_timeout(cfg, now, multiplier_k=mult_k)
            if inc:
                active_keys = await self.store.get_active_incident_keys()
                key = f"{inc['agent_id']}:{inc['rule_id']}"
                if key not in active_keys:
                    await self._persist_incident(inc)
                    # Update agent status to unavailable
                    async with get_db_connection() as conn:
                        await conn.execute(
                            "UPDATE agent_state SET status = 'unavailable', updated_at = ? WHERE agent_id = ?",
                            (now.isoformat(), r["agent_id"]),
                        )
                        await conn.commit()
                    raised.append(inc)
                    await sse_manager.broadcast("incident_raised", inc)
                    await sse_manager.broadcast("agent_updated", {"agent_id": r["agent_id"], "status": "unavailable"})
        return raised

    async def _persist_incident(self, inc: Dict[str, Any]) -> None:
        async with get_db_connection() as conn:
            await conn.execute(
                """
                INSERT INTO incidents (
                    incident_id, agent_id, timestamp, severity, confidence,
                    title, description, rule_id, evidence_event_ids, trace_id,
                    potential_impact, recommended_action, status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    inc["incident_id"],
                    inc["agent_id"],
                    inc["timestamp"],
                    inc["severity"],
                    inc["confidence"],
                    inc["title"],
                    inc["description"],
                    inc["rule_id"],
                    json.dumps(inc.get("evidence_event_ids", [])),
                    inc.get("trace_id"),
                    inc["potential_impact"],
                    inc["recommended_action"],
                    inc.get("status", "Active"),
                    inc["timestamp"],
                    inc["timestamp"]
                )
            )
            await conn.commit()


aegis_supervisor = AegisSupervisor()
