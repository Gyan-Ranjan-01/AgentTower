from __future__ import annotations
import json
import uuid
import hashlib
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.app.db import get_db_connection
from backend.broker.broker import permission_broker
from backend.admin.admin import agent_administration
from backend.app.sse import sse_manager


class RemediationManager:
    """Read-only planner proposing structured remediation procedures without direct config mutation capability."""

    async def propose_plan(self, incident_id: str) -> Dict[str, Any]:
        async with get_db_connection() as conn:
            cursor = await conn.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
            inc = await cursor.fetchone()
            if not inc:
                raise ValueError(f"Incident '{incident_id}' not found.")

        agent_id = inc["agent_id"]
        rule_id = inc["rule_id"]
        evidence_ids = json.loads(inc["evidence_event_ids"]) if inc["evidence_event_ids"] else []

        plan_id = f"plan-{uuid.uuid4().hex[:8]}"
        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if rule_id == "RULE_UNAUTHORISED_RETRIEVAL":
            summary = f"Restrict document scope of agent '{agent_id}' to authorized departments only."
            root_cause = (
                f"Agent '{agent_id}' configuration or retriever query improperly requested cross-department "
                "scopes (e.g. 'hr' personnel/salary data) while assigned to 'finance' duties."
            )
            proposed_modifications = [
                "Remove 'hr' and any non-finance tags from allowed_departments in agent registry.",
                "Reinforce department scoping policy on local document retrieval pipeline."
            ]
            procedure = [
                "1. Verify target agent role and designated department.",
                "2. Remove unauthorized departments from allowed_departments allowlist.",
                "3. Sync updated configuration to config/agents.yaml.",
                "4. Run validation test: assert HR documents yield access denial.",
                "5. Run validation test: assert Finance documents remain 100% accessible."
            ]
            config_changes = {
                "allowed_departments": ["finance"]
            }
            expected_result = "Agent can retrieve all legitimate finance documents; cross-department HR documents are rejected."
            risks = "None for legitimate finance workflows. Low risk of over-restriction."
            downtime = "0 seconds (hot-reload configuration applied without restart)."
            permissions = ["config:write:allowed_departments"]
            validation_tests = [
                {"type": "retrieval_check", "department": "hr", "expected_allowed": False},
                {"type": "finance_functional_check", "expected": True}
            ]
            rollback_strategy = {
                "action": "restore_previous_agent_state",
                "condition": "validation_test_failure"
            }

        elif rule_id == "RULE_EXECUTION_LOOP":
            summary = f"Reset tool retry threshold and throttle duplicate inputs for '{agent_id}'."
            root_cause = f"Agent '{agent_id}' entered repetitive invocation loop with identical input hash."
            proposed_modifications = [
                "Impose strict retry ceiling of 2 attempts on the offending tool.",
                "Flush pending execution context."
            ]
            procedure = [
                "1. Audit repeated tool input hashes.",
                "2. Configure max retry limit to 2.",
                "3. Reset execution run status."
            ]
            config_changes = {
                "max_retries": 2
            }
            expected_result = "Offending loop terminates immediately; subsequent runs abort on 2nd repeat."
            risks = "Transient task rejection if underlying service was slow."
            downtime = "0 seconds."
            permissions = ["config:write:policies"]
            validation_tests = [
                {"type": "loop_retry_check", "expected_allowed": True}
            ]
            rollback_strategy = {
                "action": "restore_policy",
                "condition": "retry_failure"
            }

        else:
            summary = f"Standard remediation procedure for incident '{incident_id}' ({rule_id})."
            root_cause = f"Violation of supervisory rule {rule_id} by agent '{agent_id}'."
            proposed_modifications = ["Apply standard policy guardrails and reset agent state."]
            procedure = ["1. Review incident evidence.", "2. Re-apply baseline policies."]
            config_changes = {}
            expected_result = "System returns to nominal baseline operating state."
            risks = "Minimal."
            downtime = "0 seconds."
            permissions = ["config:write"]
            validation_tests = []
            rollback_strategy = {"action": "revert"}

        # Calculate immutable plan hash
        hash_payload = {
            "incident_id": incident_id,
            "agent_id": agent_id,
            "config_changes": config_changes,
            "procedure": procedure,
            "validation_tests": validation_tests
        }
        plan_hash = hashlib.sha256(json.dumps(hash_payload, sort_keys=True).encode("utf-8")).hexdigest()

        plan_data = {
            "plan_id": plan_id,
            "incident_id": incident_id,
            "agent_id": agent_id,
            "summary": summary,
            "probable_root_cause": root_cause,
            "evidence": [{"event_id": eid} for eid in evidence_ids],
            "proposed_modifications": proposed_modifications,
            "step_by_step_procedure": procedure,
            "config_changes": config_changes,
            "expected_result": expected_result,
            "risks_and_side_effects": risks,
            "expected_downtime": downtime,
            "required_permissions": permissions,
            "validation_tests": validation_tests,
            "rollback_strategy": rollback_strategy,
            "plan_hash": plan_hash,
            "status": "Proposed",
            "created_at": now
        }

        async with get_db_connection() as conn:
            await conn.execute(
                """
                INSERT INTO remediation_plans (
                    plan_id, incident_id, agent_id, summary, probable_root_cause,
                    evidence, proposed_modifications, step_by_step_procedure,
                    config_changes, expected_result, risks_and_side_effects,
                    expected_downtime, required_permissions, validation_tests,
                    rollback_strategy, plan_hash, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Proposed', ?)
                """,
                (
                    plan_id,
                    incident_id,
                    agent_id,
                    summary,
                    root_cause,
                    json.dumps(plan_data["evidence"]),
                    json.dumps(proposed_modifications),
                    json.dumps(procedure),
                    json.dumps(config_changes),
                    expected_result,
                    risks,
                    downtime,
                    json.dumps(permissions),
                    json.dumps(validation_tests),
                    json.dumps(rollback_strategy),
                    plan_hash,
                    now
                )
            )
            # Update incident status to In Remediation
            await conn.execute(
                "UPDATE incidents SET status = 'In Remediation', updated_at = ? WHERE incident_id = ?",
                (now, incident_id)
            )
            await conn.commit()

        await sse_manager.broadcast("remediation_plan_proposed", plan_data)
        return plan_data

    async def get_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        async with get_db_connection() as conn:
            cursor = await conn.execute("SELECT * FROM remediation_plans WHERE plan_id = ?", (plan_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                "plan_id": row["plan_id"],
                "incident_id": row["incident_id"],
                "agent_id": row["agent_id"],
                "summary": row["summary"],
                "probable_root_cause": row["probable_root_cause"],
                "evidence": json.loads(row["evidence"]) if row["evidence"] else [],
                "proposed_modifications": json.loads(row["proposed_modifications"]) if row["proposed_modifications"] else [],
                "step_by_step_procedure": json.loads(row["step_by_step_procedure"]) if row["step_by_step_procedure"] else [],
                "config_changes": json.loads(row["config_changes"]) if row["config_changes"] else {},
                "expected_result": row["expected_result"],
                "risks_and_side_effects": row["risks_and_side_effects"],
                "expected_downtime": row["expected_downtime"],
                "required_permissions": json.loads(row["required_permissions"]) if row["required_permissions"] else [],
                "validation_tests": json.loads(row["validation_tests"]) if row["validation_tests"] else [],
                "rollback_strategy": json.loads(row["rollback_strategy"]) if row["rollback_strategy"] else {},
                "plan_hash": row["plan_hash"],
                "status": row["status"],
                "created_at": row["created_at"]
            }

    async def approve_and_execute(
        self,
        plan_id: str,
        actor: str = "Alice Chen (VP Finance)"
    ) -> Dict[str, Any]:
        plan = await self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found.")

        # Issue task-scoped token via Permission Broker
        token = await permission_broker.issue_token(
            plan_id=plan["plan_id"],
            task_id=f"task-rem-{uuid.uuid4().hex[:6]}",
            target_agent_id=plan["agent_id"],
            permitted_operations=plan["required_permissions"],
            approved_parameters=plan["config_changes"],
            plan_hash=plan["plan_hash"],
            ttl_seconds=300
        )

        # Delegate execution to Agent Administration (the only authorized writer)
        operation = plan["required_permissions"][0] if plan["required_permissions"] else "config:write"
        result = await agent_administration.execute_remediation(
            token_id=token["token_id"],
            plan_id=plan["plan_id"],
            target_agent_id=plan["agent_id"],
            operation=operation,
            config_changes=plan["config_changes"],
            validation_tests=plan["validation_tests"],
            rollback_strategy=plan["rollback_strategy"],
            plan_hash=plan["plan_hash"],
            actor=actor
        )

        await sse_manager.broadcast("remediation_executed", {"plan_id": plan_id, "result": result})
        return result


remediation_manager = RemediationManager()
