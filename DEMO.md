# AgentTower — 2-Minute Live Demo Script (TECHgium 10th Edition)

**Target Audience:** Engineering Judges (L&T Technology Services)  
**Demo Duration:** Exactly 2 minutes (inside a 7-minute presentation)  
**Operating Mode:** Offline Repeatable (`LLM_MODE=scripted`)  
**Prerequisite:** Run `python run.py --reset` before the talk to start from a pristine seeded state.

---

## Pre-Flight Check (T-30s before talk)
1. Open browser to `http://localhost:3000` (1080p fullscreen).
2. Verify top-right badges:
   - Green dot: `Live SSE Stream`
   - Yellow badge: `LLM Mode: scripted`
3. Click `Reset State` button to confirm instantaneous (<10s) baseline restoration.

---

## ACT 1: One Pane, Any Framework (0:00 – 0:40)

### Click & Talk Track:
1. **[0:00 - 0:15] Overview Dashboard**
   - *Point to headline KPIs:* "Judges, this is AgentTower—a framework-agnostic control plane. Notice our 4 registered autonomous agents running simultaneously: LangChain, CrewAI, AutoGen, and a Custom Orchestrator. Every number on this screen is computed from real execution events in SQLite WAL, not simulated data."
   - *Point to Cost Attribution KPI:* "We attribute token volume and spend per agent, team, and task in real time via OpenTelemetry-compatible span context."

2. **[0:15 - 0:40] Lineage DAG Navigation**
   - *Click `Lineage DAG` in top navbar.*
   - *Select the Orchestrator Trace from the dropdown.*
   - *Hover over nodes:* "Notice our unified distributed trace: `User Request → Executive Orchestrator → (Research Agent, Finance Analyst) → Report Generation → Output`. Click any node to inspect latency, token count, and raw metadata. Inter-agent delegation is transparent regardless of which Python framework powers each agent."

---

## ACT 2: Incident to Fix — Governed Remediation (0:40 – 1:25)

### Click & Talk Track:
1. **[0:40 - 0:55] Live Fault Injection**
   - *Click `Demo Controls` in top navbar.*
   - *Click `Inject Fault` on `V4: Flagship — Cross-Department Retrieval`.*
   - *Explain:* "Let's test runtime governance. We trigger a real prompt where our Finance RAG agent queries confidential HR executive compensation files."
   - *Click `Incidents` in navbar.*
   - *Point to Critical Alert:* "Within 734 milliseconds, AEGIS—our read-only autonomous supervisor—flags an active **Critical** incident: `Unauthorised cross-department document access (hr)`. Notice the linked evidence event and strict confidence score."

2. **[0:55 - 1:25] Governed Remediation Workflow**
   - *Click `Inspect & Remediate →` on the incident.*
   - *Show Remediation Plan:* "Notice our permission boundary: AEGIS is strictly read-only. It proposes a structured remediation plan with a deterministic SHA-256 Plan Hash: `Remove 'hr' from allowed_departments`.
   - *Click `Approve & Execute Remediation`.*
   - *Explain as the screen turns green:* "On approval, our Permission Broker generated a single-use, task-scoped HMAC token. Agent Administration—the ONLY authorized writer—validated the token signature, applied the config change, and automatically ran post-remediation verification tests: Finance docs remain 100% accessible; HR documents are rejected. The incident is now officially `Resolved`."

---

## ACT 3: Real-Time Decision Gate & Audit (1:25 – 2:00)

### Click & Talk Track:
1. **[1:25 - 1:45] Decision Gate Hold & Approval**
   - *Click `Demo Controls`.*
   - *Click `Inject Fault` on `V6: Decision Gate Escalation Hold`.*
   - *Click `Decision Gate` in navbar.*
   - *Show Held Action:* "Our IT agent attempted to invoke `restart_service` on production infrastructure. Under our policy rules, this action is paused in real-time. Notice the accumulated spend and parameters."
   - *Select Approver `Bob Kumar (DevOps Lead)` and click `Authorize Execution`.*
   - *Explain:* "The tool call resumes and completes under full human authorization."

2. **[1:45 - 2:00] Append-Only Audit & Reset**
   - *Click `Audit & Replay` in navbar.*
   - *Show Audit Log Table:* "Every human approval, token hash, configuration mutation, and validation result is written to an immutable append-only audit trail."
   - *Click `Reset State` in the top navbar.*
   - *Point to stopwatch:* "And if you want to test again, our reset restores the clean baseline in under 10 seconds. Thank you."
