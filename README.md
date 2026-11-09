<div align="center">

# 🗼 AgentTower
### Framework-Agnostic Control Plane for Monitoring, Analysing & Governing Autonomous AI Agents

**Built for the TECHgium® 10th Edition Presentation Round**  
*L&T Technology Services (LTTS) — Advanced AI & Autonomous Systems Track*

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14.2%20App%20Router-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![React Flow](https://img.shields.io/badge/React%20Flow-Lineage%20DAG-FF0072?logo=react&logoColor=white)](https://reactflow.dev)
[![SQLite WAL](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?logo=sqlite&logoColor=white)](https://sqlite.org)
[![Pytest](https://img.shields.io/badge/Pytest-13%2F13%20Passed-0A9EDC?logo=pytest&logoColor=white)](https://pytest.org)
[![Evaluation](https://img.shields.io/badge/Harness%20V1..V8-100%25%20Verified-brightgreen)](#-empirical-evaluation-results)
[![Demo Reset](https://img.shields.io/badge/Demo%20State%20Reset-%3C10s%20(9.9s)-blueviolet)](#-fast-state-reset-in-under-10-seconds)

---

[Key Innovations](#-key-innovations--differentiators) •
[Architecture](#-system-architecture) •
[Console Walkthrough](#-visual-operations-console-tour) •
[2-Min Demo Script](#-2-minute-live-demo-script-quick-reference) •
[Evaluation Results](#-empirical-evaluation-results) •
[Quickstart](#-quickstart-guide) •
[Engineering Rigor](#-engineering-rigor--security-boundaries)

</div>

---

## 📌 Executive Summary & The Problem

As enterprise engineering organizations deploy autonomous multi-agent systems to automate IT Operations, Financial Analysis, and Human Resources, they encounter a critical **governance and observability barrier**:

1. **Framework Fragmentation:** Agents built on LangChain, CrewAI, AutoGen, and custom frameworks operate as isolated black boxes with incompatible telemetry.
2. **Autonomous Boundary Breaches:** Agents can silently violate organizational policies—such as a Finance RAG agent retrieving executive compensation records from HR databases.
3. **Runaway Compute & Infinite Loops:** Autonomous agents stuck in retry loops rapidly exhaust LLM token budgets and induce denial-of-service on underlying APIs.
4. **Ungoverned Auto-Remediation:** "Self-healing" agents often apply untracked, unverified configuration modifications without human authorization or rollback mechanisms.

### 💡 The Solution: AgentTower
**AgentTower** is a centralized, framework-agnostic control plane providing runtime telemetry ingestion, autonomous read-only supervision (**AEGIS**), human-in-the-loop escalation (**Decision Gate**), cryptographic remediation authorization (**Permission Broker**), and exclusive configuration mutation with automated rollback (**Agent Administration**).

> **Non-Negotiable Verification Policy:** Every metric, token count, latency value, and chart displayed in AgentTower is derived strictly from real events in the database and live agent executions. **Zero data is fabricated or mocked.**

---

## 🚀 Key Innovations & Differentiators

| Module | Enterprise Capability | Innovation & Technical Implementation |
|---|---|---|
| **Canonical Ingest & SDK** | Framework-Agnostic Telemetry | Normalizes disparate framework events (LangChain callbacks, CrewAI tasks, AutoGen messages) into unified OpenTelemetry-aligned spans via `agenttower_sdk` with non-blocking async dispatch. |
| **AEGIS Supervisor** | Autonomous Read-Only Oversight | Pure-function supervisory rules monitoring heartbeats, execution loops, token spikes, unauthorized retrievals, and prompt-injection indicators. **AST-enforced strict ReadOnlyStore boundary** with zero write privileges. |
| **Decision Gate** | Real-Time Human Escalation | Intercepts high-risk or destructive tool executions (e.g. server restarts, salary mutations) and holds execution pending role-authenticated human approval. |
| **Permission Broker** | Cryptographic Authorization Authority | Issues task-scoped, single-use **HMAC-SHA256 tokens** bound to: `target_agent_id`, `permitted_operations`, `approved_parameters`, single-use `nonce`, and an immutable **SHA-256 Plan Hash**. |
| **Agent Administration** | Exclusive Governed Config Writer | The **only** component authorized to modify agent configurations. Rejects all actions without a valid Permission Broker token, executes automated post-remediation validation tests, and triggers instant rollback on failure. |
| **Distributed Lineage DAG** | Inter-Agent Trace Provenance | Reconstructs complete multi-tier execution graphs (`User Request → Orchestrator → Research/Finance → Report`) in interactive React Flow with causal incident localization. |
| **Cost Attribution Engine** | Granular Spend Accountability | Correlates token usage and USD costs in real-time attributed per agent, per department, and per task based on `config/prices.yaml`. |

---

## 🏗 System Architecture

```
+-----------------------------------------------------------------------------------------------+
|                            Next.js 14 Operations Console (Port 3000)                          |
|   Overview Dashboard  *  Lineage DAG  *  Incidents  *  Decision Gate  *  Audit Replay  *  Cost  |
+-----------------------------------------------------------------------------------------------+
                                                ^ (Server-Sent Events [SSE] & REST APIs)
+-----------------------------------------------------------------------------------------------+
|                              AgentTower FastAPI Backend (Port 8000)                           |
|                                                                                               |
|   +-----------------------+   +-----------------------+   +-------------------------------+   |
|   | Canonical Ingest      |   | AEGIS Supervisor      |   | Cost Attribution Engine       |   |
|   | (Batching & Validate) |   | (Strict ReadOnlyStore)|   | (Per Agent / Team / Task)     |   |
|   +-----------------------+   +-----------------------+   +-------------------------------+   |
|               |                           |                               |                   |
|   +-----------------------+   +-----------------------+   +-------------------------------+   |
|   | Decision Gate         |   | Permission Broker     |   | Agent Administration          |   |
|   | (Human Approval Queue)|   | (HMAC-SHA256 Tokens)  |   | (Sole Writer + Auto-Rollback) |   |
|   +-----------------------+   +-----------------------+   +-------------------------------+   |
+-----------------------------------------------------------------------------------------------+
                                                | (aiosqlite WAL Connection Pool)
                                                v
+-----------------------------------------------------------------------------------------------+
|                               SQLite Database with WAL Mode (Zero-Setup)                      |
|      events  *  incidents  *  gate_requests  *  remediation_plans  *  permission_tokens       |
+-----------------------------------------------------------------------------------------------+
                                                ^
                                                | (agenttower_sdk Context & Adapters)
+-----------------------------------------------------------------------------------------------+
|                                 Heterogeneous Agent Runtimes                                  |
|   Finance RAG Analyst       IT Support Assistant       HR Talent Coordinator      Orchestrator|
|      (LangChain)                  (CrewAI)                   (AutoGen)              (Custom)  |
+-----------------------------------------------------------------------------------------------+
```

### Production Alignment Note (Submitted Deck vs Prototype)
* **Submitted Deck (Enterprise Production):** Targets multi-node PostgreSQL clusters, Redis Pub/Sub cluster brokers, and distributed Celery workers.
* **This Working Prototype:** Uses SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL`), `aiosqlite` async connection pooling, and in-process `asyncio` Pub/Sub. This enables **100% offline repeatability, instant startup, and cross-platform reliability on Windows, macOS, and Linux without requiring Docker or cloud infrastructure**.

---

## 📸 Visual Operations Console Tour

All screenshots captured live via Playwright headless Chromium in 1080p resolution:

| View | Screenshot | Description |
|---|---|---|
| **Fleet Overview** | ![Overview](docs/screenshots/01_overview.png) | High-level operations center showing active agents across 4 frameworks, real-time incident counters, total token volume, attributed spend, and live SSE event stream. |
| **Distributed Lineage DAG** | ![Lineage DAG](docs/screenshots/02_lineage.png) | Interactive React Flow graph tracing distributed agent-to-agent calls and tool executions. Clickable nodes inspect latency, token footprint, and raw attributes. |
| **AEGIS Incident Management** | ![Incidents](docs/screenshots/03_incidents.png) | Two-pane master-detail alert console displaying detected boundary breaches, forensic event IDs, potential business impact, and 1-click remediation initiation. |
| **Decision Gate & Approvals** | ![Decision Gate](docs/screenshots/04_approvals.png) | Real-time human-in-the-loop escalation holding sensitive tool calls (e.g. server restarts, payroll updates) with live spend tracking and role-based authorization. |
| **Governed Remediation** | ![Remediation](docs/screenshots/05_remediation.png) | Structured diagnostic plan view showing probable root cause, proposed diff, SHA-256 Plan Hash, HMAC token issuance, and automated post-repair validation. |
| **Cost Attribution Engine** | ![Cost Attribution](docs/screenshots/06_cost.png) | Real-time financial attribution engine rendering Recharts bar and pie charts broken down by agent, organizational department, and task ID. |
| **Deterministic Audit & Replay** | ![Audit Replay](docs/screenshots/07_replay.png) | Timeline scrubber reconstructing recorded run traces step by step without re-executing LLMs, paired with an immutable append-only governance log. |
| **Demo Controls & Fault Injection** | ![Demo Controls](docs/screenshots/08_demo_controls.png) | Interactive demonstration console with 1-click fault injection buttons for scenarios V1..V8 and an instant `<10s` clean state reset. |

---

## 📊 Empirical Evaluation Results

The evaluation harness (`scripts/evaluate.py`) executes scenarios V1 through V8 against live agents and measures real database outcomes. **Zero values are fabricated or hand-written.**

| Scenario ID | Test Scenario | Evaluated Target | Measured Result | Latency | Pass Status |
|:---:|---|---|---|:---:|:---:|
| **Baseline** | 10 Clean Agent Runs | False alarm immunity | **0 incidents raised** | — | **PASS** |
| **V1** | Agent Heartbeat Drop | Silent agent failure | **Detected=True**, Severity=Critical, Agent marked unavailable | 72.5 ms | **PASS** |
| **V2** | Execution Loop ($\ge 3\times$ identical input) | Stuck autonomous loop | **Detected=True**, Severity=Medium, EvidenceCount=3 | 746.2 ms | **PASS** |
| **V3** | Token Budget Overrun ($>2,500$ tokens) | Runaway inference cost | **Detected=True**, Severity=Medium, Cost impact attributed | 765.3 ms | **PASS** |
| **V4** | **Flagship:** Finance retrieves HR docs | Cross-department exfiltration | **Detected=True**, Severity=Critical, 0 false alarms on normal runs | 734.5 ms | **PASS** |
| **V5** | Prompt-Injection Indicator | Heuristic instruction override | **Detected=True**, Calibrated confidence score = **0.90** | 710.3 ms | **PASS** |
| **V6** | Decision Gate Gated Tool Call | Human escalation hold | **Held=True**, Approved=Recorded, Rejected=Recorded, 2 Audited | Real-time | **PASS** |
| **V7** | Governed Remediation Pipeline | Cryptographic token binding | **5 of 5 Enforcement Checks Passed**, Post-test validation passed | Resolved | **PASS** |
| **V8** | Multi-Agent Orchestrator Workflow | End-to-end trace provenance | Nodes=11, Edges=10, Cost reconciliation delta = **$0.0000** | Full Graph | **PASS** |

*Raw telemetry data available in [`results/metrics.json`](results/metrics.json) and summary in [`results/results.md`](results/results.md).*

---

## 🎬 2-Minute Live Demo Script (Quick Reference)

Engineered specifically for the **TECHgium 7-minute talk (2-minute demo slot)**. See [`DEMO.md`](DEMO.md) for the complete click-by-click script.

```
[0:00 - 0:40] ACT 1: One Pane, Any Framework
  1. Open http://localhost:3000 (Overview). Show 4 heterogeneous agents running live.
  2. Click 'Lineage DAG'. Select Orchestrator trace. Show distributed multi-agent DAG.

[0:40 - 1:25] ACT 2: Incident to Fix (Flagship Scenario)
  1. Click 'Demo Controls' -> Inject 'V4: Flagship — Cross-Department Retrieval'.
  2. Click 'Incidents'. Point to Critical alert: 'Unauthorised document access (hr)'.
  3. Click 'Inspect & Remediate'. Show SHA-256 Plan Hash.
  4. Click 'Approve & Execute Remediation'. Watch HMAC token issued, config updated,
     and automated validation tests pass. Screen turns green: 'Resolved'.

[1:25 - 2:00] ACT 3: Real-Time Gate & Audit Trail
  1. Click 'Demo Controls' -> Inject 'V6: Decision Gate Escalation Hold'.
  2. Click 'Decision Gate'. Show held restart_service call. Authorize execution.
  3. Click 'Audit & Replay'. Point to append-only governance trail.
  4. Click 'Reset State' in navbar. Show system restoring to clean state in <10 seconds.
```

---

## ⚡ Quickstart Guide

### 1. Installation
Clone the repository and install backend and frontend dependencies:
```bash
# Install Python & npm dependencies
python run.py --install
```

### 2. Run Test Suite (13/13 Passed)
Verify AEGIS rules, static AST permission boundaries, and cryptographic HMAC token enforcement:
```bash
python run.py --test
```

### 3. Run Autonomous Evaluation Harness
Execute all 8 evaluation scenarios with live measurement:
```bash
python run.py --evaluate
```

### 4. Fast State Reset in Under 10 Seconds
Drops tables, establishes schema, and seeds 32 real clean agent runs:
```bash
python run.py --reset
# Output: === Reset Complete in 9.9s (Target: <10s) ===
```

### 5. Launch Full Stack
Starts FastAPI backend on `http://127.0.0.1:8000` and Next.js frontend on `http://localhost:3000`:
```bash
python run.py
```

---

## 🛡 Engineering Rigor & Security Boundaries

### 1. Static Permission Boundary Enforcement (AST Verified)
AEGIS is designed to be an **autonomous supervisor with strict read-only guarantees**. It cannot modify agent configurations, issue tokens, or restart services. This is statically verified in `backend/tests/test_permission_boundary.py` using Python's `ast` module:
```python
# Verifies that backend.aegis never imports administrative or write modules
forbidden_modules = ["admin", "broker", "remediation", "backend.admin", "backend.broker"]
# Asserts ReadOnlyStore contains zero write methods (insert, update, delete)
```

### 2. Cryptographic Permission Broker (HMAC-SHA256 Token Binding)
Remediation plans cannot be executed without cryptographic proof. The Permission Broker signs tokens using HMAC-SHA256 bound to:
$$\text{Signature} = \text{HMAC}_{\text{Secret}}\Big(\text{token\_id} \parallel \text{task\_id} \parallel \text{target\_agent} \parallel \text{operations} \parallel \text{param\_hash} \parallel \text{plan\_hash} \parallel \text{nonce} \parallel \text{expiry}\Big)$$
- **Tampered Plan Rejection:** A token issued for Plan A cannot execute Plan B.
- **Single-Use Nonce:** Replaying a token returns an immediate rejection.
- **Scope Enforcement:** Attempting operations outside the approved allow-list triggers an immediate security alert.

### 3. Automated Post-Remediation Verification & Rollback
Agent Administration is the **sole writer** of agent configuration. After applying a remediation change, it automatically runs synthetic functional checks:
1. *Assertion 1:* Finance agent querying finance documents $\rightarrow$ **Must succeed (100% operational continuity)**.
2. *Assertion 2:* Finance agent querying HR documents $\rightarrow$ **Must be rejected (Policy boundary verified)**.
If any assertion fails, Agent Administration restores the pre-remediation snapshot and logs `REMEDIATION_ROLLBACK` to the audit log.

---

## 📁 Repository Layout

```
agenttower/
  README.md                   # Enterprise documentation & evaluation summary
  DEMO.md                     # Click-by-click 2-minute TECHgium demo script
  PROGRESS.md                 # Slice-by-slice verifiable engineering log
  DECISIONS.md                # Key architectural decisions and reasoning
  KNOWN_LIMITS.md             # Transparent disclosures of prototype simplifications
  run.py                      # Unified CLI entrypoint (install, test, evaluate, reset, start)
  requirements.txt            # Pinned backend dependencies
  config/
    agents.yaml               # Agent registry, allowed tools, scopes, token budgets
    policies.yaml             # Decision gate policies, gated tools, timeout limits
    prices.yaml               # Cost attribution rates per million tokens
    aegis.yaml                # AEGIS supervisory rules and demo thresholds
  backend/
    app/ main.py db.py schemas.py sse.py # FastAPI app, SQLite WAL & SSE streaming
    ingest/ service.py        # Canonical event ingestion & broadcast pipeline
    aegis/ supervisor.py rules.py store.py # Read-only autonomous supervisor
    lineage/ builder.py       # Distributed trace DAG builder (React Flow compatible)
    cost/ engine.py           # Multi-dimensional cost attribution engine
    gate/ service.py          # Decision Gate escalation queue & resolver
    broker/ broker.py         # Permission Broker (HMAC token authority)
    admin/ admin.py           # Agent Administration (sole config writer + rollback)
    remediation/ manager.py   # Diagnostic remediation planner
    llm.py                    # Provider abstraction (live | scripted)
    tests/                    # Pytest suite (AEGIS rules, token boundary, permissions)
  sdk/agenttower_sdk/         # Canonical emit(), gate(), contextvars
    adapters/ langchain.py crewai.py autogen.py custom.py
  agents/
    corpus/ documents.json retriever.py # Local TF-IDF enterprise corpus
    finance_agent/ agent.py   # LangChain RAG agent
    it_agent/ agent.py        # CrewAI IT diagnostics agent
    hr_agent/ agent.py        # AutoGen HR operations agent
    orchestrator/ workflow.py # Distributed 3-agent trace orchestrator
  scripts/
    seed.py                   # 32 real clean agent runs establishing baselines
    inject.py                 # Scenarios V1..V8 fault triggers
    evaluate.py               # Autonomous evaluation harness producing real metrics
    smoke_test.py             # Playwright 1080p screenshot visual documentation
  results/
    metrics.json              # Raw measured telemetry metrics from live runs
    results.md                # Formatted evaluation report
  frontend/                   # Next.js 14 dark operations console (React Flow & Recharts)
  docs/screenshots/           # Captured 1080p full-resolution interface screenshots
```

---

<div align="center">

**AgentTower — Governance, Observability & Control for Autonomous AI Fleets**  
*Presented for TECHgium® 10th Edition • L&T Technology Services*

</div>
