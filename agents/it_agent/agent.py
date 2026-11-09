from __future__ import annotations
import time
import uuid
from typing import Dict, Any, Optional

from sdk.agenttower_sdk.adapters.crewai import AgentTowerCrewAIAdapter
from sdk.agenttower_sdk.client import sdk_client, gate
from sdk.agenttower_sdk.context import run_context, get_current_run_id, get_current_trace_id, get_current_task_id
from backend.llm import default_llm

crewai_adapter = AgentTowerCrewAIAdapter(agent_id="it_agent")


def _raw_system_diagnostics(host: str = "cluster-node-01") -> str:
    return f"Diagnostics OK: Host {host} load average 1.42, 94% memory utilization, 0 network dropped packets."


def _raw_restart_service(service_name: str = "payment-gateway-primary") -> str:
    return f"Service '{service_name}' rolling restart completed successfully. Pods active: 4/4."


def _raw_flush_cache(cache_tier: str = "redis-l2") -> str:
    return f"Cache tier '{cache_tier}' successfully invalidated (14,280 keys purged)."


# Wrapped tools
system_diagnostics = crewai_adapter.wrap_tool("system_diagnostics", _raw_system_diagnostics)
flush_cache = crewai_adapter.wrap_tool("flush_cache", _raw_flush_cache)


class ITSupportAgent:
    """IT Support & Operations agent instrumented for CrewAI task delegation."""

    def __init__(self, agent_id: str = "it_agent"):
        self.agent_id = agent_id

    def run(
        self,
        command: str = "diagnose",
        service_name: str = "payment-gateway-primary",
        loop_count: int = 1,
        force_gated_action: bool = False
    ) -> Dict[str, Any]:
        with run_context(self.agent_id):
            run_id = get_current_run_id()
            trace_id = get_current_trace_id()
            task_id = get_current_task_id()

            sdk_client.emit(
                event_type="run_start",
                agent_id=self.agent_id,
                framework="crewai",
                run_id=run_id,
                span_id=run_id,
                trace_id=trace_id,
                task_id=task_id,
                attributes={"command": command, "service": service_name}
            )

            # Execution loop injection support
            tool_outputs = []
            for _ in range(loop_count):
                out = system_diagnostics(host=service_name)
                tool_outputs.append(out)

            # If gated action requested (e.g. restart_service)
            gated_res = None
            if force_gated_action or command == "restart":
                # Decision Gate wrapper holds execution
                gated_res = gate(
                    tool_name="restart_service",
                    tool_fn=_raw_restart_service,
                    parameters={"service_name": service_name, "initiator": "it_agent"},
                    agent_id=self.agent_id,
                    service_name=service_name
                )

            # LLM summary
            llm_text, in_tok, out_tok = default_llm.generate(
                prompt=f"IT ops action completed for {service_name}",
                context={"diagnostics": tool_outputs, "gated_res": gated_res}
            )

            sdk_client.emit(
                event_type="llm_call",
                agent_id=self.agent_id,
                framework="crewai",
                input_tokens=in_tok,
                output_tokens=out_tok,
                model="scripted-mock-v1",
                duration_ms=45.0,
                status="success"
            )

            sdk_client.emit(
                event_type="run_end",
                agent_id=self.agent_id,
                framework="crewai",
                run_id=run_id,
                span_id=run_id,
                trace_id=trace_id,
                task_id=task_id,
                duration_ms=120.0,
                status="success",
                attributes={"output_length": len(llm_text)}
            )

            sdk_client.flush()
            return {
                "summary": llm_text,
                "diagnostics": tool_outputs,
                "gated_action_result": gated_res
            }
