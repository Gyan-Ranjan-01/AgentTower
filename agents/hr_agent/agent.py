from __future__ import annotations
import time
import uuid
from typing import Dict, Any, Optional

from sdk.agenttower_sdk.adapters.autogen import AgentTowerAutoGenAdapter
from sdk.agenttower_sdk.client import sdk_client, gate
from sdk.agenttower_sdk.context import run_context, get_current_run_id, get_current_trace_id, get_current_task_id
from backend.llm import default_llm

autogen_adapter = AgentTowerAutoGenAdapter(agent_id="hr_agent")


def _raw_lookup_employee(employee_id: str = "EMP-9481") -> Dict[str, Any]:
    return {
        "employee_id": employee_id,
        "name": "Sarah Connor",
        "title": "Principal Systems Architect",
        "department": "Engineering",
        "status": "Active"
    }


def _raw_update_benefits(employee_id: str, plan_name: str = "Platinum PPO") -> str:
    return f"Benefits tier for {employee_id} updated to {plan_name} with corporate HSA matching."


def _raw_send_notice(employee_id: str, notice_type: str = "open_enrolment") -> str:
    return f"Notice '{notice_type}' dispatched to {employee_id}."


lookup_employee = autogen_adapter.wrap_function("lookup_employee", _raw_lookup_employee)
send_notice = autogen_adapter.wrap_function("send_notice", _raw_send_notice)


class HRAgent:
    """HR Automation agent instrumented for AutoGen conversational message workflows."""

    def __init__(self, agent_id: str = "hr_agent"):
        self.agent_id = agent_id

    def run(
        self,
        employee_id: str = "EMP-9481",
        action: str = "lookup",
        force_gated_action: bool = False,
        swallow_error: bool = False
    ) -> Dict[str, Any]:
        with run_context(self.agent_id):
            run_id = get_current_run_id()
            trace_id = get_current_trace_id()
            task_id = get_current_task_id()

            sdk_client.emit(
                event_type="run_start",
                agent_id=self.agent_id,
                framework="autogen",
                run_id=run_id,
                span_id=run_id,
                trace_id=trace_id,
                task_id=task_id,
                attributes={"action": action, "employee_id": employee_id}
            )

            # Tool call
            emp_info = lookup_employee(employee_id=employee_id)

            # Error injection test (swallowed tool error for silent failure detection)
            if swallow_error:
                sdk_client.emit(
                    event_type="tool_call",
                    agent_id=self.agent_id,
                    framework="autogen",
                    tool_name="sync_payroll_ledger",
                    status="error",
                    attributes={"swallowed_error": True, "error_message": "Database deadlock in payroll backend"}
                )

            # If gated action requested (update_benefits is Critical risk in policies.yaml)
            gated_res = None
            if force_gated_action or action == "update_benefits":
                gated_res = gate(
                    tool_name="update_benefits",
                    tool_fn=_raw_update_benefits,
                    parameters={"employee_id": employee_id, "plan_name": "Platinum Executive PPO"},
                    agent_id=self.agent_id,
                    employee_id=employee_id,
                    plan_name="Platinum Executive PPO"
                )

            # AutoGen conversational message event
            sdk_client.emit(
                event_type="agent_call",
                agent_id=self.agent_id,
                framework="autogen",
                attributes={"target_agent": "UserProxy", "message_length": 140}
            )

            llm_text, in_tok, out_tok = default_llm.generate(
                prompt=f"HR policy update for {employee_id}",
                context={"employee": emp_info, "gated_res": gated_res}
            )

            sdk_client.emit(
                event_type="llm_call",
                agent_id=self.agent_id,
                framework="autogen",
                input_tokens=in_tok,
                output_tokens=out_tok,
                model="scripted-mock-v1",
                duration_ms=40.0,
                status="success"
            )

            sdk_client.emit(
                event_type="run_end",
                agent_id=self.agent_id,
                framework="autogen",
                run_id=run_id,
                span_id=run_id,
                trace_id=trace_id,
                task_id=task_id,
                duration_ms=95.0,
                status="success",
                attributes={"output_length": len(llm_text)}
            )

            sdk_client.flush()
            return {
                "employee": emp_info,
                "summary": llm_text,
                "gated_res": gated_res
            }

