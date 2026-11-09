from __future__ import annotations
import json
import uuid
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import yaml

from backend.app.db import get_db_connection
from backend.app.sse import sse_manager

POLICIES_FILE = Path(__file__).resolve().parent.parent.parent / "config" / "policies.yaml"


class DecisionGateService:
    def __init__(self, policy_path: Path = POLICIES_FILE):
        self.policy_path = policy_path
        self._policy: Dict[str, Any] = {}
        self.reload_policy()

    def reload_policy(self) -> None:
        if not self.policy_path.exists():
            return
        with open(self.policy_path, "r", encoding="utf-8") as f:
            self._policy = yaml.safe_load(f) or {}

    def is_tool_gated(self, tool_name: str) -> bool:
        gated = self._policy.get("decision_gate", {}).get("gated_tools", [])
        return any(t.get("name") == tool_name for t in gated)

    def get_tool_policy(self, tool_name: str) -> Optional[Dict[str, Any]]:
        gated = self._policy.get("decision_gate", {}).get("gated_tools", [])
        for t in gated:
            if t.get("name") == tool_name:
                return t
        return None

    async def submit_request(
        self,
        request_id: str,
        agent_id: str,
        run_id: str,
        trace_id: str,
        tool_name: str,
        parameters: Dict[str, Any],
        cost_so_far_usd: float = 0.0,
        timeout_seconds: int = 60,
    ) -> Dict[str, Any]:
        """Creates an approval request in the database. Auto-approves if not gated."""
        now = datetime.datetime.now(datetime.timezone.utc)
        timeout_at = now + datetime.timedelta(seconds=timeout_seconds)

        if not self.is_tool_gated(tool_name):
            # Not in gated policy; auto-approve immediately
            req_data = {
                "request_id": request_id,
                "agent_id": agent_id,
                "run_id": run_id,
                "trace_id": trace_id,
                "tool_name": tool_name,
                "parameters": parameters,
                "cost_so_far_usd": cost_so_far_usd,
                "status": "Approved",
                "timeout_at": timeout_at.isoformat(),
                "decided_by": "System Policy (Unrestricted)",
                "decided_at": now.isoformat(),
                "created_at": now.isoformat(),
            }
            return req_data

        req_data = {
            "request_id": request_id,
            "agent_id": agent_id,
            "run_id": run_id,
            "trace_id": trace_id,
            "tool_name": tool_name,
            "parameters": parameters,
            "cost_so_far_usd": cost_so_far_usd,
            "status": "Pending",
            "timeout_at": timeout_at.isoformat(),
            "decided_by": None,
            "decided_at": None,
            "created_at": now.isoformat(),
        }

        async with get_db_connection() as conn:
            await conn.execute(
                """
                INSERT INTO gate_requests (
                    request_id, agent_id, run_id, trace_id, tool_name,
                    parameters, cost_so_far_usd, status, timeout_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    request_id,
                    agent_id,
                    run_id,
                    trace_id,
                    tool_name,
                    json.dumps(parameters),
                    cost_so_far_usd,
                    "Pending",
                    timeout_at.isoformat(),
                    now.isoformat(),
                ),
            )
            await conn.commit()

        await sse_manager.broadcast("gate_request_created", req_data)
        return req_data

    async def get_request(self, request_id: str) -> Optional[Dict[str, Any]]:
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM gate_requests WHERE request_id = ?", (request_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                "request_id": row["request_id"],
                "agent_id": row["agent_id"],
                "run_id": row["run_id"],
                "trace_id": row["trace_id"],
                "tool_name": row["tool_name"],
                "parameters": json.loads(row["parameters"]) if row["parameters"] else {},
                "cost_so_far_usd": row["cost_so_far_usd"],
                "status": row["status"],
                "timeout_at": row["timeout_at"],
                "decided_by": row["decided_by"],
                "decided_at": row["decided_at"],
                "decision_reason": row["decision_reason"],
                "created_at": row["created_at"],
            }

    async def decide_request(
        self,
        request_id: str,
        decision: str,
        decided_by: str = "Alice Chen (VP Finance)",
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Approve or reject a pending gate request and write to append-only audit log."""
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        status_value = "Approved" if decision.lower() == "approve" else "Rejected"

        async with get_db_connection() as conn:
            cursor = await conn.execute("SELECT * FROM gate_requests WHERE request_id = ?", (request_id,))
            req = await cursor.fetchone()
            if not req:
                raise ValueError(f"Gate request '{request_id}' not found.")

            await conn.execute(
                """
                UPDATE gate_requests
                SET status = ?, decided_by = ?, decided_at = ?, decision_reason = ?
                WHERE request_id = ?
                """,
                (status_value, decided_by, now_iso, reason, request_id),
            )

            # Record in append-only audit log
            audit_details = {
                "request_id": request_id,
                "tool_name": req["tool_name"],
                "parameters": json.loads(req["parameters"]) if req["parameters"] else {},
                "decision": status_value,
                "reason": reason,
                "cost_so_far_usd": req["cost_so_far_usd"],
            }
            await conn.execute(
                """
                INSERT INTO audit_log (timestamp, action_type, actor, target_agent_id, details, status)
                VALUES (?, 'GATE_DECISION', ?, ?, ?, ?)
                """,
                (now_iso, decided_by, req["agent_id"], json.dumps(audit_details), status_value),
            )
            await conn.commit()

        updated = await self.get_request(request_id)
        await sse_manager.broadcast("gate_request_decided", updated or {})
        return updated or {}


gate_service = DecisionGateService()

