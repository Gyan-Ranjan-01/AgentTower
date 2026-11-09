from __future__ import annotations
import uuid
import time
from typing import Dict, Any

from sdk.agenttower_sdk.client import sdk_client
from sdk.agenttower_sdk.context import trace_context, run_context, span_context
from agents.finance_agent.agent import FinanceRAGAgent
from backend.llm import default_llm


class OrchestratorWorkflow:
    """Multi-agent orchestrator coordinating Research, Finance, and Reporting agents under a unified distributed trace."""

    def __init__(self):
        self.finance_agent = FinanceRAGAgent()

    def execute_executive_briefing(
        self,
        topic: str = "Q3 FY26 Strategic Review",
        trace_id: str | None = None
    ) -> Dict[str, Any]:
        t_id = trace_id or f"trc-orch-{uuid.uuid4().hex[:8]}"
        task_id = "task_executive_briefing"

        with trace_context(trace_id=t_id, task_id=task_id):
            # 1. Orchestrator Root Span
            root_span_id = f"spn-orch-root-{uuid.uuid4().hex[:6]}"
            sdk_client.emit(
                event_type="run_start",
                agent_id="orchestrator_agent",
                framework="custom",
                run_id=f"run-orch-{uuid.uuid4().hex[:6]}",
                span_id=root_span_id,
                parent_span_id=None,
                trace_id=t_id,
                task_id=task_id,
                attributes={"workflow": "executive_briefing", "topic": topic}
            )

            # Step A: Research Step (Market Intelligence)
            research_span_id = f"spn-research-{uuid.uuid4().hex[:6]}"
            sdk_client.emit(
                event_type="agent_call",
                agent_id="orchestrator_agent",
                framework="custom",
                span_id=research_span_id,
                parent_span_id=root_span_id,
                trace_id=t_id,
                task_id=task_id,
                attributes={"target_agent": "research_agent", "action": "market_scan"}
            )
            # Research tool: Search API
            sdk_client.emit(
                event_type="tool_call",
                agent_id="research_agent",
                framework="custom",
                tool_name="Search_API",
                span_id=f"spn-search-{uuid.uuid4().hex[:6]}",
                parent_span_id=research_span_id,
                trace_id=t_id,
                task_id=task_id,
                duration_ms=45.0,
                status="success",
                attributes={"query": f"competitor landscape {topic}"}
            )

            # Step B: Finance Step (Finance RAG Analyst)
            finance_span_id = f"spn-finance-step-{uuid.uuid4().hex[:6]}"
            sdk_client.emit(
                event_type="agent_call",
                agent_id="orchestrator_agent",
                framework="custom",
                span_id=finance_span_id,
                parent_span_id=root_span_id,
                trace_id=t_id,
                task_id=task_id,
                attributes={"target_agent": "finance_agent", "action": "financial_synthesis"}
            )

            # Run Finance RAG Agent
            fin_result = self.finance_agent.run(query=f"Analyze {topic} performance")

            # Step C: Report Generation Step
            report_span_id = f"spn-report-{uuid.uuid4().hex[:6]}"
            sdk_client.emit(
                event_type="agent_call",
                agent_id="orchestrator_agent",
                framework="custom",
                span_id=report_span_id,
                parent_span_id=root_span_id,
                trace_id=t_id,
                task_id=task_id,
                attributes={"target_agent": "report_agent", "action": "assemble_briefing"}
            )
            # Report tool: Database
            sdk_client.emit(
                event_type="tool_call",
                agent_id="report_agent",
                framework="custom",
                tool_name="Database_Sink",
                span_id=f"spn-db-{uuid.uuid4().hex[:6]}",
                parent_span_id=report_span_id,
                trace_id=t_id,
                task_id=task_id,
                duration_ms=32.0,
                status="success",
                attributes={"action": "commit_audit_snapshot"}
            )

            # Final Output Synthesis
            llm_text, in_tok, out_tok = default_llm.generate(
                prompt=f"Executive synthesis for {topic}",
                context={"financial_data": fin_result}
            )
            final_span_id = f"spn-final-{uuid.uuid4().hex[:6]}"
            sdk_client.emit(
                event_type="llm_call",
                agent_id="orchestrator_agent",
                framework="custom",
                span_id=final_span_id,
                parent_span_id=root_span_id,
                trace_id=t_id,
                task_id=task_id,
                input_tokens=in_tok,
                output_tokens=out_tok,
                model="scripted-mock-v1",
                duration_ms=85.0,
                status="success"
            )

            sdk_client.emit(
                event_type="run_end",
                agent_id="orchestrator_agent",
                framework="custom",
                span_id=root_span_id,
                parent_span_id=None,
                trace_id=t_id,
                task_id=task_id,
                duration_ms=280.0,
                status="success",
                attributes={"final_output": llm_text[:120], "output_size": len(llm_text)}
            )

            sdk_client.flush()
            return {
                "trace_id": t_id,
                "topic": topic,
                "executive_briefing": llm_text,
                "finance_data": fin_result
            }


orchestrator_workflow = OrchestratorWorkflow()
