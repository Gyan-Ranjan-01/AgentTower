from __future__ import annotations
import os
import json
import time
import datetime
from typing import Dict, Any, List, Optional
import yaml

PRICES_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config", "prices.yaml")


class AdaptiveIntelligenceService:
    def __init__(self):
        self.manager_agent = {
            "agent_id": "aegis_supervisor_agent",
            "name": "AEGIS Strategic Supervisor",
            "framework": "AEGIS / LangChain Sovereign",
            "role": "Supervisory Correlation & Governed Remediation Orchestrator",
            "assigned_model": "gpt-4o",
            "intelligence_tier": "Tier 3: High-Capability Frontier",
            "operating_mode": "Continuous Sovereign Supervision",
            "status": "Active Supervisor",
            "token_budget_24h": 100_000,
            "tokens_used_24h": 45_200,
            "est_daily_cost_usd": 0.282,
            "capabilities": [
                "Cross-agent causal DAG correlation",
                "Automated root-cause hypothesis generation",
                "Cryptographic HMAC remediation synthesis",
                "Decision Gate escalation arbitration"
            ]
        }

        self.monitoring_bots: Dict[str, Dict[str, Any]] = {
            "finance_sentinel_bot": {
                "bot_id": "finance_sentinel_bot",
                "name": "Finance Compliance Sentinel",
                "target_agent": "finance_agent",
                "framework": "LangChain",
                "department": "Finance",
                "base_model": "gpt-4o-mini",
                "assigned_model": "gpt-4o-mini",
                "intelligence_tier": "Tier 1: Lightweight",
                "operating_mode": "Economy",  # Economy | Standard | Premium
                "is_premium_temporary": False,
                "premium_expires_at": None,
                "tokens_used_24h": 124_500,
                "est_daily_cost_usd": 0.046,
                "status": "Healthy & Monitoring",
                "monitoring_tasks": [
                    "RAG retrieval boundary scoping",
                    "Cross-department document access audit",
                    "Token budget overrun surveillance"
                ]
            },
            "it_infra_monitor_bot": {
                "bot_id": "it_infra_monitor_bot",
                "name": "IT Infrastructure Sentinel",
                "target_agent": "it_agent",
                "framework": "CrewAI",
                "department": "IT Operations",
                "base_model": "gemini-1.5-flash",
                "assigned_model": "gemini-1.5-flash",
                "intelligence_tier": "Tier 1: Lightweight",
                "operating_mode": "Standard",
                "is_premium_temporary": False,
                "premium_expires_at": None,
                "tokens_used_24h": 210_000,
                "est_daily_cost_usd": 0.038,
                "status": "Healthy & Monitoring",
                "monitoring_tasks": [
                    "Heartbeat pulse verification (30s interval)",
                    "Subprocess latency spike triage",
                    "Restricted tool invocation hold"
                ]
            },
            "hr_privacy_guard_bot": {
                "bot_id": "hr_privacy_guard_bot",
                "name": "HR Privacy & PII Guard",
                "target_agent": "hr_agent",
                "framework": "AutoGen",
                "department": "Human Resources",
                "base_model": "claude-3-haiku",
                "assigned_model": "claude-3-haiku",
                "intelligence_tier": "Tier 1: Lightweight",
                "operating_mode": "Economy",
                "is_premium_temporary": False,
                "premium_expires_at": None,
                "tokens_used_24h": 88_000,
                "est_daily_cost_usd": 0.044,
                "status": "Healthy & Monitoring",
                "monitoring_tasks": [
                    "Executive compensation masking",
                    "PII data pattern detection",
                    "Prompt-injection heuristic analysis"
                ]
            },
            "workflow_tracer_bot": {
                "bot_id": "workflow_tracer_bot",
                "name": "Distributed Workflow Tracer",
                "target_agent": "orchestrator_agent",
                "framework": "AgentTower Native SDK",
                "department": "Cross-Functional",
                "base_model": "llama-3.1-8b",
                "assigned_model": "llama-3.1-8b",
                "intelligence_tier": "Tier 1: Lightweight",
                "operating_mode": "Standard",
                "is_premium_temporary": False,
                "premium_expires_at": None,
                "tokens_used_24h": 320_000,
                "est_daily_cost_usd": 0.048,
                "status": "Healthy & Monitoring",
                "monitoring_tasks": [
                    "Execution loop detection (3x hash)",
                    "Span duration latency accumulation",
                    "Parent-child trace graph integrity"
                ]
            }
        }

        self.activity_logs: List[Dict[str, Any]] = [
            {
                "log_id": "act-01",
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "event": "System Baseline Initialized",
                "bot_id": "all",
                "details": "Routine monitoring initialized on Economy & Standard tiers using lightweight models.",
                "type": "info"
            }
        ]

    def get_pricing_catalog(self) -> Dict[str, Any]:
        """Loads and returns rich pricing directory from config/prices.yaml."""
        if not os.path.exists(PRICES_FILE):
            return {"models": {}, "default": {"input_usd": 1.50, "output_usd": 6.00}}
        with open(PRICES_FILE, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        models_data = data.get("rates_per_million_tokens", {}).get("models", {})
        
        # Count currently assigned models
        assigned_counts: Dict[str, int] = {}
        for bot in self.monitoring_bots.values():
            m = bot["assigned_model"]
            assigned_counts[m] = assigned_counts.get(m, 0) + 1
        mgr_m = self.manager_agent["assigned_model"]
        assigned_counts[mgr_m] = assigned_counts.get(mgr_m, 0) + 1

        catalog = []
        for model_id, info in models_data.items():
            catalog.append({
                "model_id": model_id,
                "tier": info.get("tier", "Standard"),
                "category": info.get("category", "General LLM"),
                "description": info.get("description", ""),
                "input_usd_per_m": info.get("input_usd", 1.50),
                "output_usd_per_m": info.get("output_usd", 6.00),
                "active_instances": assigned_counts.get(model_id, 0),
                "is_running": assigned_counts.get(model_id, 0) > 0,
            })

        return {
            "rates_per_million_tokens": data.get("rates_per_million_tokens", {}),
            "catalog": catalog
        }

    def _check_and_expire_temporary_upgrades(self):
        """Downgrades bots whose temporary premium window has expired."""
        now = time.time()
        for bot_id, bot in self.monitoring_bots.items():
            if bot.get("is_premium_temporary") and bot.get("premium_expires_at"):
                if now >= bot["premium_expires_at"]:
                    # Expire and revert
                    old_model = bot["assigned_model"]
                    base_model = bot["base_model"]
                    bot["assigned_model"] = base_model
                    bot["is_premium_temporary"] = False
                    bot["premium_expires_at"] = None
                    bot["intelligence_tier"] = "Tier 1: Lightweight"
                    bot["operating_mode"] = "Economy" if bot["operating_mode"] == "Premium" else bot["operating_mode"]
                    self.activity_logs.insert(0, {
                        "log_id": f"act-{len(self.activity_logs) + 1}",
                        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                        "event": "Temporary Premium Expired (Auto-Downgrade)",
                        "bot_id": bot_id,
                        "details": f"{bot['name']} automatically reverted from {old_model} to base model {base_model}.",
                        "type": "downgrade"
                    })

    def get_adaptive_state(self) -> Dict[str, Any]:
        """Returns full state for the Adaptive Intelligence & Cost Control console."""
        self._check_and_expire_temporary_upgrades()

        total_bots_cost = sum(b["est_daily_cost_usd"] for b in self.monitoring_bots.values())
        manager_cost = self.manager_agent["est_daily_cost_usd"]
        total_daily_cost = round(total_bots_cost + manager_cost, 4)

        # Baseline without three-stage pipeline (if all events were run on GPT-4o)
        total_tokens = sum(b["tokens_used_24h"] for b in self.monitoring_bots.values()) + self.manager_agent["tokens_used_24h"]
        all_frontier_daily_cost = round((total_tokens / 1_000_000.0) * 12.50, 4)
        net_savings_pct = round(((all_frontier_daily_cost - total_daily_cost) / max(all_frontier_daily_cost, 0.01)) * 100, 1)

        return {
            "manager_agent": self.manager_agent,
            "monitoring_bots": list(self.monitoring_bots.values()),
            "three_stage_pipeline": {
                "stage_1_rules": {
                    "name": "Stage 1: Deterministic Rule-Based Checks",
                    "description": "Heartbeat delta, exact tool hash, boundary allow-lists",
                    "cost_usd": 0.00,
                    "resolution_rate_pct": 84.5,
                    "model": "Zero-Token In-Memory Rules Engine"
                },
                "stage_2_small_llm": {
                    "name": "Stage 2: Lightweight Small-LLM Analysis",
                    "description": "Log triage, prompt injection heuristics, anomaly classification",
                    "cost_usd": round(total_bots_cost, 4),
                    "resolution_rate_pct": 13.5,
                    "model": "gpt-4o-mini / gemini-1.5-flash / claude-3-haiku"
                },
                "stage_3_frontier_llm": {
                    "name": "Stage 3: Powerful Frontier LLM Investigation",
                    "description": "Multi-agent causal correlation & HMAC remediation synthesis",
                    "cost_usd": round(manager_cost, 4),
                    "resolution_rate_pct": 2.0,
                    "model": self.manager_agent["assigned_model"]
                },
                "total_daily_spend_usd": total_daily_cost,
                "all_frontier_cost_usd": all_frontier_daily_cost,
                "cost_reduction_pct": net_savings_pct
            },
            "activity_logs": self.activity_logs[:20]
        }

    def set_bot_operating_mode(self, bot_id: str, mode: str) -> Dict[str, Any]:
        """Sets operating mode for a bot: Economy | Standard | Premium."""
        if bot_id not in self.monitoring_bots:
            raise KeyError(f"Bot '{bot_id}' not found.")
        
        bot = self.monitoring_bots[bot_id]
        old_mode = bot["operating_mode"]
        old_model = bot["assigned_model"]

        if mode == "Premium":
            bot["operating_mode"] = "Premium"
            bot["assigned_model"] = "gpt-4o"
            bot["intelligence_tier"] = "Tier 3: High-Capability Frontier"
            bot["est_daily_cost_usd"] = round(bot["est_daily_cost_usd"] * 5.2, 4)
            event_type = "upgrade"
        elif mode == "Standard":
            bot["operating_mode"] = "Standard"
            bot["assigned_model"] = bot["base_model"]
            bot["intelligence_tier"] = "Tier 1: Lightweight + Event Handoff"
            bot["est_daily_cost_usd"] = round(bot["est_daily_cost_usd"] * 1.3 if old_mode == "Economy" else bot["est_daily_cost_usd"], 4)
            event_type = "config"
        else:  # Economy
            bot["operating_mode"] = "Economy"
            bot["assigned_model"] = bot["base_model"]
            bot["intelligence_tier"] = "Tier 1: Lightweight"
            bot["est_daily_cost_usd"] = round(bot["est_daily_cost_usd"] / 5.2 if old_mode == "Premium" else bot["est_daily_cost_usd"], 4)
            event_type = "downgrade"

        bot["is_premium_temporary"] = False
        bot["premium_expires_at"] = None

        self.activity_logs.insert(0, {
            "log_id": f"act-{len(self.activity_logs) + 1}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "event": f"Operating Mode Changed: {old_mode} → {mode}",
            "bot_id": bot_id,
            "details": f"{bot['name']} switched to {mode} mode. Model: {old_model} → {bot['assigned_model']}.",
            "type": event_type
        })

        return self.get_adaptive_state()

    def set_temporary_premium_upgrade(self, bot_id: str, duration_minutes: int, model: str = "gpt-4o") -> Dict[str, Any]:
        """Temporarily upgrades a monitoring bot to Premium with an expiry timer."""
        if bot_id not in self.monitoring_bots:
            raise KeyError(f"Bot '{bot_id}' not found.")

        bot = self.monitoring_bots[bot_id]
        old_model = bot["assigned_model"]
        expiry_ts = time.time() + (duration_minutes * 60)

        bot["assigned_model"] = model
        bot["is_premium_temporary"] = True
        bot["premium_expires_at"] = expiry_ts
        bot["intelligence_tier"] = f"Tier 3: Temporary Premium ({duration_minutes}m)"

        self.activity_logs.insert(0, {
            "log_id": f"act-{len(self.activity_logs) + 1}",
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "event": f"Temporary Premium Upgrade ({duration_minutes} min)",
            "bot_id": bot_id,
            "details": f"{bot['name']} upgraded from {old_model} to {model} for deep investigation. Auto-reverts in {duration_minutes}m.",
            "type": "upgrade"
        })

        return self.get_adaptive_state()


adaptive_service = AdaptiveIntelligenceService()

