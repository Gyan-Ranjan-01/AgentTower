from __future__ import annotations
import sys
import time
import asyncio
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.db import reset_db
from agents.finance_agent.agent import FinanceRAGAgent
from agents.it_agent.agent import ITSupportAgent
from agents.hr_agent.agent import HRAgent
from agents.orchestrator.workflow import OrchestratorWorkflow
from sdk.agenttower_sdk.client import sdk_client


def run_seed():
    print("=" * 60)
    print("AgentTower Baseline Seeder: Running ~30 Real Agent Executions")
    print("=" * 60)

    # 1. Reset database to clean schema and seed agent definitions
    asyncio.run(reset_db())
    print("[1/4] Database initialized with clean schema and agent registry.")

    finance_agent = FinanceRAGAgent()
    it_agent = ITSupportAgent()
    hr_agent = HRAgent()
    orchestrator = OrchestratorWorkflow()

    # 2. Finance Clean Runs (12 runs)
    finance_queries = [
        "What was our Q3 revenue and operating EBITDA margin?",
        "What are the FY26 capital expenditure allocation guidelines?",
        "Explain our working capital and cash flow liquidity policy.",
        "Check our quarterly debt covenant compliance and leverage ratios.",
        "How do we handle revenue recognition under ASC 606?",
        "What is our projected Q4 financial outlook and operating cash flow?",
        "Review our corporate tax provisions and R&D credit utilization.",
        "Summarize internal audit controls and dual-authorization rules.",
        "What is our Days Sales Outstanding (DSO) and CECL bad debt reserve?",
        "Explain vendor payment terms and procurement signature thresholds.",
        "Calculate our operating cash flow liquidity surplus.",
        "Review full year EBITDA margin targets versus baseline."
    ]

    print("\n[2/4] Executing 12 clean Finance RAG runs (LangChain)...")
    for idx, q in enumerate(finance_queries, start=1):
        finance_agent.run(query=q)
        print(f"  - Finance run {idx:02d}/12 completed: '{q[:40]}...'")
        time.sleep(0.02)

    # 3. IT Support Clean Runs (10 runs)
    it_nodes = [
        "cluster-node-01", "cluster-node-02", "ingress-gateway-01",
        "redis-cache-primary", "db-read-replica-1", "db-read-replica-2",
        "k8s-control-plane", "kafka-broker-01", "kafka-broker-02", "auth-service-pod"
    ]
    print("\n[3/4] Executing 10 clean IT Support runs (CrewAI)...")
    for idx, node in enumerate(it_nodes, start=1):
        it_agent.run(command="diagnose", service_name=node)
        print(f"  - IT run {idx:02d}/10 completed: diagnostics on {node}")
        time.sleep(0.02)

    # 4. HR Automation Clean Runs (8 runs)
    emp_ids = [
        "EMP-9481", "EMP-9482", "EMP-9483", "EMP-9484",
        "EMP-9485", "EMP-9486", "EMP-9487", "EMP-9488"
    ]
    print("\n[4/4] Executing 8 clean HR Automation runs (AutoGen)...")
    for idx, emp in enumerate(emp_ids, start=1):
        hr_agent.run(employee_id=emp, action="lookup")
        print(f"  - HR run {idx:02d}/08 completed: lookup for {emp}")
        time.sleep(0.02)

    # 5. Multi-agent Orchestrator workflow runs (2 runs)
    print("\n[*] Executing 2 end-to-end multi-agent Orchestrator workflow traces...")
    orchestrator.execute_executive_briefing(topic="Q3 Financial Performance")
    orchestrator.execute_executive_briefing(topic="Enterprise Cloud Infrastructure")

    # Flush all remaining events
    sdk_client.flush()
    time.sleep(0.5)

    print("\n" + "=" * 60)
    print("Seeding Complete: 32 Clean Agent Runs Executed Successfully.")
    print("Baseline metrics, tokens, and historical distributions established.")
    print("=" * 60)


if __name__ == "__main__":
    run_seed()
