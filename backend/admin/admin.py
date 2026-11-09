from __future__ import annotations
import json
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import yaml

from backend.app.db import get_db_connection
from backend.broker.broker import permission_broker
from agents.corpus.retriever import local_retriever

CONFIG_FILE = Path(__file__).resolve().parent.parent.parent / "config" / "agents.yaml"


class AgentAdministration:
    """The SOLE authorized writer of agent configurations.

    Requires a valid cryptographically signed Permission Broker token for any modification.
    Executes changes, runs post-remediation validation tests, and performs automated rollback on failure.
    """

    async def get_agent_config(self, agent_id: str) -> Optional[Dict[str, Any]]:
        async with get_db_connection() as conn:
            cursor = await conn.execute("SELECT * FROM agent_state WHERE agent_id = ?", (agent_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                "agent_id": row["agent_id"],
                "name": row["name"],
                "framework": row["framework"],
                "department": row["department"],
                "team": row["team"],
                "owner": row["owner"],
                "allowed_tools": json.loads(row["allowed_tools"]),
                "allowed_departments": json.loads(row["allowed_departments"]),
                "token_budget_per_run": row["token_budget_per_run"],
                "heartbeat_interval_s": row["heartbeat_interval_s"],
                "status": row["status"]
            }

    async def execute_remediation(
        self,
        token_id: str,
        plan_id: str,
        target_agent_id: str,
        operation: str,
        config_changes: Dict[str, Any],
        validation_tests: List[Dict[str, Any]],
        rollback_strategy: Dict[str, Any],
        plan_hash: str,
        actor: str = "Alice Chen (VP Finance)"
    ) -> Dict[str, Any]:
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Step 1: Verify token with Permission Broker
        try:
            await permission_broker.verify_and_consume(
                token_id=token_id,
                plan_id=plan_id,
                target_agent_id=target_agent_id,
                operation=operation,
                parameters=config_changes,
                plan_hash=plan_hash,
            )
        except Exception as e:
            # Audit unauthorized attempt
            async with get_db_connection() as conn:
                await conn.execute(
                    """
                    INSERT INTO audit_log (timestamp, action_type, actor, target_agent_id, details, plan_hash, token_id, status)
                    VALUES (?, 'REMEDIATION_EXECUTION_REFUSED', ?, ?, ?, ?, ?, 'Refused')
                    """,
                    (now_iso, actor, target_agent_id, json.dumps({"error": str(e), "operation": operation}), plan_hash, token_id)
                )
                await conn.commit()
            raise PermissionError(f"Agent Administration refused execution: {e}")

        # Step 2: Take snapshot for rollback
        original_config = await self.get_agent_config(target_agent_id)
        if not original_config:
            raise ValueError(f"Target agent '{target_agent_id}' does not exist.")

        # Step 3: Apply config changes to DB & config/agents.yaml
        new_allowed_depts = config_changes.get("allowed_departments", original_config["allowed_departments"])
        new_allowed_tools = config_changes.get("allowed_tools", original_config["allowed_tools"])
        new_token_budget = config_changes.get("token_budget_per_run", original_config["token_budget_per_run"])

        async with get_db_connection() as conn:
            await conn.execute(
                """
                UPDATE agent_state
                SET allowed_departments = ?, allowed_tools = ?, token_budget_per_run = ?, updated_at = ?
                WHERE agent_id = ?
                """,
                (
                    json.dumps(new_allowed_depts),
                    json.dumps(new_allowed_tools),
                    new_token_budget,
                    now_iso,
                    target_agent_id
                )
            )
            await conn.commit()

        self._sync_yaml(target_agent_id, new_allowed_depts, new_allowed_tools, new_token_budget)

        # Step 4: Execute automated validation tests
        validation_passed = True
        test_results = []

        for test in validation_tests:
            test_type = test.get("type", "retrieval_check")
            if test_type == "retrieval_check":
                dept_to_test = test.get("department", "hr")
                expected_allowed = test.get("expected_allowed", False)

                # Check if current updated config allows dept_to_test
                updated_agent = await self.get_agent_config(target_agent_id)
                is_allowed = dept_to_test in (updated_agent.get("allowed_departments", []) if updated_agent else [])

                passed = (is_allowed == expected_allowed)
                test_results.append({
                    "test": f"department_access_{dept_to_test}",
                    "expected_allowed": expected_allowed,
                    "actual_allowed": is_allowed,
                    "passed": passed
                })
                if not passed:
                    validation_passed = False

            elif test_type == "finance_functional_check":
                # Ensure finance documents can still be retrieved normally
                res = local_retriever.retrieve("Q3 revenue", top_k=1, force_department="finance")
                passed = len(res) > 0
                test_results.append({"test": "finance_docs_accessible", "passed": passed})
                if not passed:
                    validation_passed = False

        # Step 5: Handle rollback if validation fails
        if not validation_passed:
            # Revert config
            async with get_db_connection() as conn:
                await conn.execute(
                    """
                    UPDATE agent_state
                    SET allowed_departments = ?, allowed_tools = ?, token_budget_per_run = ?, updated_at = ?
                    WHERE agent_id = ?
                    """,
                    (
                        json.dumps(original_config["allowed_departments"]),
                        json.dumps(original_config["allowed_tools"]),
                        original_config["token_budget_per_run"],
                        now_iso,
                        target_agent_id
                    )
                )
                await conn.execute(
                    """
                    INSERT INTO audit_log (timestamp, action_type, actor, target_agent_id, details, plan_hash, token_id, status)
                    VALUES (?, 'REMEDIATION_ROLLBACK', ?, ?, ?, ?, ?, 'RolledBack')
                    """,
                    (now_iso, actor, target_agent_id, json.dumps({"test_results": test_results}), plan_hash, token_id)
                )
                await conn.commit()
            self._sync_yaml(
                target_agent_id,
                original_config["allowed_departments"],
                original_config["allowed_tools"],
                original_config["token_budget_per_run"]
            )
            return {"status": "Failed", "rollback": True, "test_results": test_results}

        # Step 6: Success! Record in audit log & resolve incident
        async with get_db_connection() as conn:
            await conn.execute(
                """
                INSERT INTO audit_log (timestamp, action_type, actor, target_agent_id, details, plan_hash, token_id, status)
                VALUES (?, 'CONFIG_MODIFIED_AND_VALIDATED', ?, ?, ?, ?, ?, 'Resolved')
                """,
                (
                    now_iso,
                    actor,
                    target_agent_id,
                    json.dumps({
                        "changes": config_changes,
                        "test_results": test_results
                    }),
                    plan_hash,
                    token_id
                )
            )
            # Resolve incident
            cursor = await conn.execute("SELECT incident_id FROM remediation_plans WHERE plan_id = ?", (plan_id,))
            plan_row = await cursor.fetchone()
            if plan_row:
                await conn.execute(
                    "UPDATE incidents SET status = 'Resolved', updated_at = ? WHERE incident_id = ?",
                    (now_iso, plan_row["incident_id"])
                )
            await conn.execute(
                "UPDATE remediation_plans SET status = 'Executed' WHERE plan_id = ?", (plan_id,)
            )
            await conn.commit()

        return {"status": "Resolved", "rollback": False, "test_results": test_results}

    def _sync_yaml(self, agent_id: str, allowed_depts: list, allowed_tools: list, token_budget: int) -> None:
        if not CONFIG_FILE.exists():
            return
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        for ag in data.get("agents", []):
            if ag.get("agent_id") == agent_id:
                ag["allowed_departments"] = allowed_depts
                ag["allowed_tools"] = allowed_tools
                ag["token_budget_per_run"] = token_budget

        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False)


agent_administration = AgentAdministration()
