from __future__ import annotations
import os
import json
from pathlib import Path
from contextlib import asynccontextmanager
import aiosqlite
import yaml

DB_PATH = Path(__file__).resolve().parent.parent.parent / "agenttower.sqlite"
CONFIG_DIR = Path(__file__).resolve().parent.parent.parent / "config"


@asynccontextmanager
async def get_db_connection():
    conn = await aiosqlite.connect(str(DB_PATH))
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA journal_mode=WAL;")
    await conn.execute("PRAGMA synchronous=NORMAL;")
    await conn.execute("PRAGMA busy_timeout=5000;")
    await conn.execute("PRAGMA foreign_keys=ON;")
    try:
        yield conn
    finally:
        await conn.close()


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,
    organization_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    framework TEXT NOT NULL,
    run_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    trace_id TEXT NOT NULL,
    span_id TEXT NOT NULL,
    parent_span_id TEXT,
    event_type TEXT NOT NULL,
    tool_name TEXT,
    status TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    model TEXT,
    duration_ms REAL DEFAULT 0.0,
    timestamp TEXT NOT NULL,
    attributes TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_events_trace_id ON events(trace_id);
CREATE INDEX IF NOT EXISTS idx_events_agent_id ON events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);

CREATE TABLE IF NOT EXISTS incidents (
    incident_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 1.0,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    rule_id TEXT NOT NULL,
    evidence_event_ids TEXT NOT NULL DEFAULT '[]',
    trace_id TEXT,
    potential_impact TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incidents_agent ON incidents(agent_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON incidents(timestamp);

CREATE TABLE IF NOT EXISTS gate_requests (
    request_id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    trace_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    parameters TEXT NOT NULL DEFAULT '{}',
    cost_so_far_usd REAL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'Pending',
    timeout_at TEXT NOT NULL,
    decided_by TEXT,
    decided_at TEXT,
    decision_reason TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gate_status ON gate_requests(status);
CREATE INDEX IF NOT EXISTS idx_gate_run ON gate_requests(run_id);

CREATE TABLE IF NOT EXISTS remediation_plans (
    plan_id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    summary TEXT NOT NULL,
    probable_root_cause TEXT NOT NULL,
    evidence TEXT NOT NULL DEFAULT '[]',
    proposed_modifications TEXT NOT NULL DEFAULT '[]',
    step_by_step_procedure TEXT NOT NULL DEFAULT '[]',
    config_changes TEXT NOT NULL DEFAULT '{}',
    expected_result TEXT NOT NULL,
    risks_and_side_effects TEXT NOT NULL,
    expected_downtime TEXT NOT NULL,
    required_permissions TEXT NOT NULL DEFAULT '[]',
    validation_tests TEXT NOT NULL DEFAULT '[]',
    rollback_strategy TEXT NOT NULL DEFAULT '{}',
    plan_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Proposed',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permission_tokens (
    token_id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    target_agent_id TEXT NOT NULL,
    permitted_operations TEXT NOT NULL DEFAULT '[]',
    approved_parameters_hash TEXT NOT NULL,
    plan_hash TEXT NOT NULL,
    nonce TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    hmac_signature TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    revoked INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    action_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    target_agent_id TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    plan_hash TEXT,
    token_id TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_state (
    agent_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    framework TEXT NOT NULL,
    department TEXT NOT NULL,
    team TEXT NOT NULL,
    owner TEXT NOT NULL,
    allowed_tools TEXT NOT NULL DEFAULT '[]',
    allowed_departments TEXT NOT NULL DEFAULT '[]',
    token_budget_per_run INTEGER NOT NULL,
    heartbeat_interval_s INTEGER NOT NULL,
    last_heartbeat TEXT,
    status TEXT NOT NULL DEFAULT 'healthy',
    updated_at TEXT NOT NULL
);
"""


async def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with get_db_connection() as conn:
        await conn.executescript(SCHEMA_SQL)
        await conn.commit()
    await sync_agents_from_config()


async def sync_agents_from_config() -> None:
    agents_file = CONFIG_DIR / "agents.yaml"
    if not agents_file.exists():
        return
    with open(agents_file, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    agents = data.get("agents", [])

    import datetime
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    async with get_db_connection() as conn:
        for a in agents:
            await conn.execute(
                """
                INSERT INTO agent_state (
                    agent_id, name, framework, department, team, owner,
                    allowed_tools, allowed_departments, token_budget_per_run,
                    heartbeat_interval_s, status, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy', ?)
                ON CONFLICT(agent_id) DO UPDATE SET
                    name=excluded.name,
                    framework=excluded.framework,
                    department=excluded.department,
                    team=excluded.team,
                    owner=excluded.owner,
                    allowed_tools=excluded.allowed_tools,
                    allowed_departments=excluded.allowed_departments,
                    token_budget_per_run=excluded.token_budget_per_run,
                    heartbeat_interval_s=excluded.heartbeat_interval_s,
                    updated_at=excluded.updated_at
                """,
                (
                    a["agent_id"],
                    a["name"],
                    a["framework"],
                    a["department"],
                    a["team"],
                    a["owner"],
                    json.dumps(a.get("allowed_tools", [])),
                    json.dumps(a.get("allowed_departments", [])),
                    a.get("token_budget_per_run", 3000),
                    a.get("heartbeat_interval_s", 10),
                    now,
                ),
            )
        await conn.commit()


async def reset_db() -> None:
    """Drops tables and re-initializes cleanly."""
    if DB_PATH.exists():
        async with get_db_connection() as conn:
            tables = [
                "events", "incidents", "gate_requests",
                "remediation_plans", "permission_tokens", "audit_log", "agent_state"
            ]
            for t in tables:
                await conn.execute(f"DROP TABLE IF EXISTS {t};")
            await conn.commit()
    await init_db()
