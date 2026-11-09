# AgentTower Known Limitations (KNOWN_LIMITS.md)

1. **Storage Engine**: Prototype uses SQLite in WAL mode with connection concurrency rather than production PostgreSQL + Redis as outlined in the deck.
2. **Replay Mechanism**: The audit replay reconstructs recorded execution traces and state transitions chronologically; it deliberately does not re-invoke the LLM.
3. **Corpus Size**: The local RAG corpus contains ~20 curated enterprise policy documents across Finance, HR, and IT to enable instantaneous offline deterministic evaluation.
4. **Framework Adapters**: Adapters hook into real callback systems (LangChain `BaseCallbackHandler`, etc.). Where third-party frameworks introduce environment conflicts or heavy dependencies, standard SDK instrumentation wrappers are utilized with explicit labels in the UI.

