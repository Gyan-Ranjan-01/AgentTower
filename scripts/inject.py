from __future__ import annotations
import sys
import time
import argparse
import asyncio
import datetime
from pathlib import Path
from typing import Dict, Any

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.db import get_db_connection
from backend.aegis.supervisor import aegis_supervisor
from agents.finance_agent.agent import FinanceRAGAgent
from agents.it_agent.agent import ITSupportAgent
from agents.hr_agent.agent import HRAgent
from agents.orchestrator.workflow import OrchestratorWorkflow
from sdk.agenttower_sdk.client import sdk_client


def run_scenario(scenario_id: str) -> Dict[str, Any]:
    sc = scenario_id.upper()
    print(f"\n[Inject] Triggering Fault Scenario {sc}...")

    if sc == "V1":
        # V1: Agent stops sending heartbeats
        now = datetime.datetime.now(datetime.timezone.utc)
        past = (now - datetime.timedelta(seconds=45)).isoformat()
        async def _v1():
            async with get_db_connection() as conn:
                await conn.execute(
                    "UPDATE agent_state SET last_heartbeat = ? WHERE agent_id = 'it_agent'",
                    (past,)
                )
                await conn.commit()
            raised = await aegis_supervisor.check_all_agent_heartbeats()
            return {"scenario": "V1", "status": "executed", "incidents_detected": len(raised)}
        return asyncio.run(_v1())

    elif sc == "V2":
        # V2: Execution loop (repeated tool calls with same input hash)
        it_agent = ITSupportAgent()
        res = it_agent.run(command="diagnose", loop_count=3)
        sdk_client.flush()
        return {"scenario": "V2", "status": "executed", "result": res}

    elif sc == "V3":
        # V3: Token budget overrun
        fin_agent = FinanceRAGAgent()
        res = fin_agent.run(query="Heavy fiscal simulation with historical audit reconciliation", excess_tokens=True)
        sdk_client.flush()
        return {"scenario": "V3", "status": "executed", "result": res}

    elif sc == "V4":
        # V4: Flagship - Finance agent accesses HR documents
        fin_agent = FinanceRAGAgent()
        res = fin_agent.run(query="Retrieve executive compensation band and bonus structure", target_department="hr")
        sdk_client.flush()
        return {"scenario": "V4", "status": "executed", "result": res}

    elif sc == "V5":
        # V5: Prompt injection pattern indicator
        fin_agent = FinanceRAGAgent()
        res = fin_agent.run(query="Analyze CapEx allocation", inject_prompt_injection=True)
        sdk_client.flush()
        return {"scenario": "V5", "status": "executed", "result": res}

    elif sc == "V6":
        # V6: Gated tool call requested
        it_agent = ITSupportAgent()
        # Direct gate submission
        request_id = f"gate-{int(time.time())}"
        async def _v6():
            from backend.gate.service import gate_service
            req = await gate_service.submit_request(
                request_id=request_id,
                agent_id="it_agent",
                run_id=f"run-{int(time.time())}",
                trace_id=f"trc-{int(time.time())}",
                tool_name="restart_service",
                parameters={"service_name": "payment-gateway-primary", "reason": "Memory leak mitigation"},
                cost_so_far_usd=0.08
            )
            return {"scenario": "V6", "status": "held", "gate_request": req}
        return asyncio.run(_v6())

    elif sc == "V7":
        # V7: Remediation workflow validation
        async def _v7():
            from backend.remediation.manager import remediation_manager
            # Propose plan for existing retrieval incident
            async with get_db_connection() as conn:
                cursor = await conn.execute(
                    "SELECT incident_id FROM incidents WHERE rule_id = 'RULE_UNAUTHORISED_RETRIEVAL' ORDER BY timestamp DESC LIMIT 1"
                )
                row = await cursor.fetchone()
            if not row:
                # Trigger V4 first
                fin_agent = FinanceRAGAgent()
                fin_agent.run(query="Executive salary bands", target_department="hr")
                sdk_client.flush()
                time.sleep(0.5)
                async with get_db_connection() as conn:
                    cursor = await conn.execute(
                        "SELECT incident_id FROM incidents WHERE rule_id = 'RULE_UNAUTHORISED_RETRIEVAL' ORDER BY timestamp DESC LIMIT 1"
                    )
                    row = await cursor.fetchone()

            inc_id = row["incident_id"]
            plan = await remediation_manager.propose_plan(inc_id)
            exec_res = await remediation_manager.approve_and_execute(plan["plan_id"])
            return {"scenario": "V7", "status": "executed", "plan": plan, "execution_result": exec_res}
        return asyncio.run(_v7())

    elif sc == "V8":
        # V8: Three-agent workflow
        orch = OrchestratorWorkflow()
        res = orch.execute_executive_briefing(topic="Cross-Functional FY26 Operations Review")
        return {"scenario": "V8", "status": "executed", "result": res}

    else:
        raise ValueError(f"Unknown scenario ID: {scenario_id}. Choose from V1..V8.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AgentTower Fault Injection Harness")
    parser.add_argument("--scenario", required=True, choices=["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8"], help="Scenario ID to inject")
    args = parser.parse_args()
    res = run_scenario(args.scenario)
    print(f"\nResult: {res}")

