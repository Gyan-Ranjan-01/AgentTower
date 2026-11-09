import pytest
import asyncio
import datetime
from backend.app.db import reset_db
from backend.broker.broker import permission_broker
from backend.admin.admin import agent_administration


@pytest.fixture(autouse=True)
def setup_db():
    asyncio.run(reset_db())


def test_token_execution_without_valid_token_refused():
    """Execution without a valid token must be refused."""
    async def run():
        with pytest.raises(PermissionError) as exc_info:
            await agent_administration.execute_remediation(
                token_id="fake-invalid-token",
                plan_id="plan-1",
                target_agent_id="finance_agent",
                operation="config:write:allowed_departments",
                config_changes={"allowed_departments": ["finance"]},
                validation_tests=[],
                rollback_strategy={},
                plan_hash="hash-123"
            )
        assert "not found" in str(exc_info.value).lower() or "refused" in str(exc_info.value).lower()
    asyncio.run(run())


def test_token_for_plan_a_cannot_run_plan_b():
    """Token bound to plan A cannot be executed for plan B."""
    async def run():
        token = await permission_broker.issue_token(
            plan_id="plan-A",
            task_id="task-1",
            target_agent_id="finance_agent",
            permitted_operations=["config:write:allowed_departments"],
            approved_parameters={"allowed_departments": ["finance"]},
            plan_hash="hash-A",
            ttl_seconds=300
        )
        with pytest.raises(PermissionError) as exc_info:
            await agent_administration.execute_remediation(
                token_id=token["token_id"],
                plan_id="plan-B",  # Tampered plan ID
                target_agent_id="finance_agent",
                operation="config:write:allowed_departments",
                config_changes={"allowed_departments": ["finance"]},
                validation_tests=[],
                rollback_strategy={},
                plan_hash="hash-A"
            )
        assert "plan hash mismatch" in str(exc_info.value).lower() or "refused" in str(exc_info.value).lower()
    asyncio.run(run())


def test_expired_token_refused():
    """Token that has exceeded its TTL must be refused."""
    async def run():
        token = await permission_broker.issue_token(
            plan_id="plan-exp",
            task_id="task-2",
            target_agent_id="finance_agent",
            permitted_operations=["config:write:allowed_departments"],
            approved_parameters={"allowed_departments": ["finance"]},
            plan_hash="hash-exp",
            ttl_seconds=-10  # Already expired
        )
        with pytest.raises(PermissionError) as exc_info:
            await agent_administration.execute_remediation(
                token_id=token["token_id"],
                plan_id="plan-exp",
                target_agent_id="finance_agent",
                operation="config:write:allowed_departments",
                config_changes={"allowed_departments": ["finance"]},
                validation_tests=[],
                rollback_strategy={},
                plan_hash="hash-exp"
            )
        assert "expired" in str(exc_info.value).lower()
    asyncio.run(run())


def test_reused_token_refused():
    """Single-use nonce must prevent token replay."""
    async def run():
        token = await permission_broker.issue_token(
            plan_id="plan-reuse",
            task_id="task-3",
            target_agent_id="finance_agent",
            permitted_operations=["config:write:allowed_departments"],
            approved_parameters={"allowed_departments": ["finance"]},
            plan_hash="hash-reuse",
            ttl_seconds=300
        )
        # First execution should succeed
        res = await agent_administration.execute_remediation(
            token_id=token["token_id"],
            plan_id="plan-reuse",
            target_agent_id="finance_agent",
            operation="config:write:allowed_departments",
            config_changes={"allowed_departments": ["finance"]},
            validation_tests=[],
            rollback_strategy={},
            plan_hash="hash-reuse"
        )
        assert res["status"] == "Resolved"

        # Replay attempt must be refused!
        with pytest.raises(PermissionError) as exc_info:
            await agent_administration.execute_remediation(
                token_id=token["token_id"],
                plan_id="plan-reuse",
                target_agent_id="finance_agent",
                operation="config:write:allowed_departments",
                config_changes={"allowed_departments": ["finance"]},
                validation_tests=[],
                rollback_strategy={},
                plan_hash="hash-reuse"
            )
        assert "already been consumed" in str(exc_info.value).lower()
    asyncio.run(run())


def test_operation_outside_allowlist_refused():
    """An operation not granted in the token's permitted_operations must be refused."""
    async def run():
        token = await permission_broker.issue_token(
            plan_id="plan-op",
            task_id="task-4",
            target_agent_id="finance_agent",
            permitted_operations=["config:write:allowed_departments"],  # Only allowed depts
            approved_parameters={"allowed_tools": ["super_admin_tool"]},
            plan_hash="hash-op",
            ttl_seconds=300
        )
        with pytest.raises(PermissionError) as exc_info:
            await agent_administration.execute_remediation(
                token_id=token["token_id"],
                plan_id="plan-op",
                target_agent_id="finance_agent",
                operation="system:root_exec",  # Unallowed operation
                config_changes={"allowed_tools": ["super_admin_tool"]},
                validation_tests=[],
                rollback_strategy={},
                plan_hash="hash-op"
            )
        assert "outside the token permitted allow-list" in str(exc_info.value).lower()
    asyncio.run(run())
