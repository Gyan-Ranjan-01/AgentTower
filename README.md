# AgentTower — Framework-Agnostic AI Agent Control Plane

> **Prototype Build for TECHgium 10th Edition (L&T Technology Services Presentation Round)**  
> Evaluated for: Reliability, Zero Fabricated Metrics, Cross-Framework Observability, Autonomous AEGIS Supervision & Governed Remediation.

---

## 1. Overview & Architectural Stack

AgentTower is a framework-agnostic control plane engineered to monitor, analyze, and govern autonomous AI agents across enterprise deployments. It abstracts heterogeneous agent runtimes (LangChain, CrewAI, AutoGen, and custom orchestrators) into a single canonical event telemetry stream.

```
+-----------------------------------------------------------------------------------+
|                            Next.js 14 Operations Console                          |
|   Overview  *  Distributed Lineage DAG  *  Incidents  *  Decision Gate  *  Replay  |
+-----------------------------------------------------------------------------------+
                                         ^ (SSE Real-Time Push / REST API)
+-----------------------------------------------------------------------------------+
|                            AgentTower FastAPI Backend                             |
|  +--------------------+  +----------------------+  +----------------------------+  |
|  | Canonical Ingest   |  | AEGIS Supervisor     |  | Cost Attribution Engine   |  |
|  | (/api/events)      |  | (Strict Read-Only)   |  | (config/prices.yaml)       |  |
|  +--------------------+  +----------------------+  +----------------------------+  |
|  +--------------------+  +----------------------+  +----------------------------+  |
|  | Decision Gate      |  | Permission Broker    |  | Agent Administration       |  |
|  | (Human Escalation) |  | (HMAC-SHA256 Tokens) |  | (Exclusive Config Writer)  |  |
|  +--------------------+  +----------------------+  +----------------------------+  |
+-----------------------------------------------------------------------------------+
                                         ^ (aiosqlite WAL Database)
+-----------------------------------------------------------------------------------+
|                              agenttower_sdk Client                                |
|        LangChain Adapter   *   CrewAI Adapter   *   AutoGen Adapter               |
+-----------------------------------------------------------------------------------+
                                         ^
+-----------------------------------------------------------------------------------+
|                            Autonomous Agent Workflows                             |
|  Finance RAG (LangChain) | IT Support (CrewAI) | HR (AutoGen) | Orchestrator DAG  |
+-----------------------------------------------------------------------------------+
```

### Production vs Prototype Note (Deck Alignment)
- **Production Architecture (Deck):** Utilizes PostgreSQL for canonical event storage, Redis Pub/Sub for cluster broadcast, and distributed Celery workers.
- **Prototype Implementation:** Utilizes SQLite with Write-Ahead Logging (`PRAGMA journal_mode=WAL`), `aiosqlite` async connection pools, and in-memory `asyncio` Pub/Sub queues. This enables zero-dependency offline repeatability on Windows, macOS, and Linux without sacrificing transactional semantics.

---

## 2. Key Components

### 2.1 Canonical Event Schema
A unified telemetry schema representing actions across any agent framework:
- `event_id`, `organization_id`, `agent_id`, `framework`, `run_id`, `task_id`, `trace_id`, `span_id`, `parent_span_id`, `event_type`, `tool_name`, `status`, `input_tokens`, `output_tokens`, `model`, `duration_ms`, `timestamp`, `attributes` (JSON).

### 2.2 AEGIS Autonomous Supervisor (Read-Only)
- **Guaranteed Boundary:** Pure-function detectors operating strictly through a `ReadOnlyStore` interface. Statically enforced via AST unit tests—has zero import paths to `admin`, `broker`, or mutation modules.
- **Supervisory Rules (`config/aegis.yaml`):**
  1. *Silent Failure & Heartbeat Loss*: Detects unannounced agent crashes or swallowed tool exceptions.
  2. *Execution Loops*: Detects repetitive tool calls with identical input hashes ($\ge 3$ within $120\text{s}$).
  3. *Token Spikes*: Flags runs exceeding per-agent budget or exceeding $k\cdot\sigma$ above baseline.
  4. *Unauthorised Retrieval*: Flags any retrieval touching documents outside the agent's allow-list.
  5. *Prompt-Injection Indicator*: Scans retrieved content for instruction overrides and outputs a calibrated confidence score (never a premature false certainty).

### 2.3 Decision Gate (Real-Time Escalation)
- SDK wrapper `gate(tool_name, tool_fn, ...)` holds execution of gated tools (e.g. `restart_service`, `update_benefits`).
- Requests appear in the UI queue with accumulated run spend, arguments, and approver selector.
- Supports timeout default rejection and audits every approval/rejection decision.

### 2.4 Governed Remediation Pipeline
1. **Remediation Manager**: Proposes a structured plan with an immutable cryptographic Plan Hash.
2. **Permission Broker**: Issues task-scoped, single-use HMAC-SHA256 tokens bound to plan hash, agent, and permitted operations.
3. **Agent Administration**: The **only** authorized writer of agent configs. Validates tokens, executes mutations, executes automated validation tests, and triggers instant rollback on failure.

---

## 3. Quick Start (<2 Minutes)

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Install Dependencies
```bash
python run.py --install
```

### 2. Run Test Suite (13/13 Unit & Boundary Tests)
```bash
python run.py --test
```

### 3. Run Autonomous Evaluation Harness (Measures V1..V8)
```bash
python run.py --evaluate
```

### 4. Fast Clean Reset (<10 Seconds)
```bash
python run.py --reset
```

### 5. Launch Full Stack (Backend + Frontend)
```bash
python run.py
```
- **Operations Console:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 4. Evaluation Results (`results/results.md`)

*Measured from real database queries and real agent executions (zero hard-coded numbers):*

| ID | Scenario | Expected Behavior | Measured Result | Latency | Pass Status |
|---|---|---|---|---|:---:|
| **V1** | Agent stops sending heartbeats | Incident raised; Agent marked unavailable | Detected=True, Severity=Critical | 72.5 ms | **PASS** |
| **V2** | Same query repeated N× in window | Execution loop incident (Medium) with linked evidence | Detected=True, Severity=Medium, EvCount=3 | 746.2 ms | **PASS** |
| **V3** | Run exceeds token budget | Token-anomaly incident with cost impact | Detected=True, Severity=Medium, 0 False Alarms | 765.3 ms | **PASS** |
| **V4** | Finance agent retrieves HR docs | Critical incident; normal retrievals raise none | Detected=True, Severity=Critical, 0 False Positives | 734.5 ms | **PASS** |
| **V5** | Prompt-injection text in doc | Flagged with confidence score | Detected=True, Confidence=0.90 | 710.3 ms | **PASS** |
| **V6** | Gated action requested | Action held; approve runs; reject aborts; audited | Held=True, Approve=True, Reject=True | 2 Audited Events | **PASS** |
| **V7** | Remediation: plan binding & tokens | Refused on bad/expired tokens; rollback on failure | Enforcement Tests: 5 of 5 Passed | Status: Resolved | **PASS** |
| **V8** | Three-agent workflow end to end | Lineage DAG matches call graph; cost reconciles | Nodes=11, Edges=10 | Delta: $0.0000 | **PASS** |

---

## 5. Repository Structure
```
agenttower/
  README.md                   # System documentation & quickstart
  DEMO.md                     # Click-by-click 2-minute TECHgium demo script
  PROGRESS.md                 # Verifiable slice-by-slice build log
  DECISIONS.md                # Architectural decisions & reasoning
  KNOWN_LIMITS.md             # Honest disclosures of prototype simplifications
  run.py                      # One entrypoint: install, seed, test, evaluate, reset, start
  requirements.txt            # Pinned backend dependencies
  config/
    agents.yaml               # Agent registry, scopes, tools, token budgets
    policies.yaml             # Decision gate policies, gated tools, timeout limits
    prices.yaml               # Example cost attribution rates per million tokens
    aegis.yaml                # AEGIS supervisory rules and demo thresholds
  backend/
    app/ main.py db.py schemas.py sse.py
    ingest/ service.py        # Event ingest pipeline & broadcast
    aegis/ supervisor.py rules.py store.py # Read-only supervisor
    lineage/ builder.py       # DAG builder from trace spans
    cost/ engine.py           # Cost attribution engine
    gate/ service.py          # Decision Gate queue & human escalation
    broker/ broker.py         # Cryptographic HMAC token authority
    admin/ admin.py           # Exclusive configuration writer & test runner
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
    evaluate.py               # Automated evaluation harness
  results/
    metrics.json              # Raw measured telemetry metrics
    results.md                # Formatted evaluation report
  frontend/                   # Next.js 14 dark operations console (React Flow & Recharts)
```
