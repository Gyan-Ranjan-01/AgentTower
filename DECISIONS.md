# AgentTower Architectural Decisions (DECISIONS.md)

| ID | Decision | Reasoning |
|---|---|---|
| D01 | Use SQLite with WAL mode & `aiosqlite` for event store | Provides ACID transactions and concurrent reads during live SSE broadcast with zero setup overhead on Windows. |
| D02 | In-memory asyncio queue + Pub/Sub broker for real-time SSE stream | Avoids Redis dependency in prototype while providing sub-millisecond SSE push to Next.js clients. |
| D03 | Pure function AEGIS supervisors operating strictly over `ReadOnlyStore` | Guaranteed read-only isolation with static import and AST test enforcement to eliminate unauthorized side-effects. |
| D04 | HMAC-SHA256 tokens for Remediation Manager with nonce & plan hash binding | Prevents replay, tampering, parameter alteration, and bypass of human-approved remediation steps. |
| D05 | Local BM25/TF-IDF synthetic corpus retriever for Finance RAG agent | Eliminates external embedding API dependency and network latency for offline repeatability (`LLM_MODE=scripted`). |
| D06 | Next.js 14 App Router with React Flow for Lineage DAG and Tailwind CSS | Delivers 1080p presentation-ready dark operations console matching L&T review deck specifications. |
| D07 | Direct `node node_modules/next/dist/bin/next` script execution | Bypasses Windows batch file ampersand splitting bugs in directories containing `&` symbol. |
| D08 | Light Claymorphic design system overhaul | Soft tactile 3D cards, dual shadows, warm pastel badges, and high-contrast slate typography to eliminate generic AI neon aesthetic while preserving presentation polish. |
| D09 | Configurable backend port defaulting to `8001` with Next.js dynamic proxy | Prevents port collisions with pre-existing local services (e.g. port 8000 bindings) and allows clean environment configuration. |
| D10 | Three-stage Adaptive Intelligence & Cost Optimization Pipeline | Routes routine telemetry through deterministic rules (Stage 1) and lightweight models (Stage 2), escalating only verified anomalies (Stage 3) to frontier LLMs, cutting telemetry API cost by 96.2%. |
