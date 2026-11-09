from __future__ import annotations
import json
import datetime
from typing import Dict, Any, List
from backend.app.db import get_db_connection
from backend.aegis.supervisor import aegis_supervisor
from backend.app.sse import sse_manager


async def process_incoming_events(raw_events: List[Dict[str, Any]]) -> int:
    """Core event processing pipeline: persists events, updates agent health, and triggers AEGIS rules."""
    stored_count = 0
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    async with get_db_connection() as conn:
        for ev in raw_events:
            event_id = ev.get("event_id") or f"ev-{datetime.datetime.now().timestamp()}"
            org_id = ev.get("organization_id", "org-default")
            agent_id = ev.get("agent_id", "unknown_agent")
            framework = ev.get("framework", "custom")
            run_id = ev.get("run_id", "")
            task_id = ev.get("task_id", "")
            trace_id = ev.get("trace_id", "")
            span_id = ev.get("span_id", "")
            parent_span_id = ev.get("parent_span_id")
            event_type = ev.get("event_type", "custom")
            tool_name = ev.get("tool_name")
            status = ev.get("status", "success")
            input_tokens = int(ev.get("input_tokens") or 0)
            output_tokens = int(ev.get("output_tokens") or 0)
            model = ev.get("model", "scripted-mock-v1")
            duration_ms = float(ev.get("duration_ms") or 0.0)
            ts = ev.get("timestamp") or now
            attrs = json.dumps(ev.get("attributes", {}))

            await conn.execute(
                """
                INSERT OR IGNORE INTO events (
                    event_id, organization_id, agent_id, framework, run_id, task_id,
                    trace_id, span_id, parent_span_id, event_type, tool_name, status,
                    input_tokens, output_tokens, model, duration_ms, timestamp, attributes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id, org_id, agent_id, framework, run_id, task_id,
                    trace_id, span_id, parent_span_id, event_type, tool_name, status,
                    input_tokens, output_tokens, model, duration_ms, ts, attrs,
                ),
            )

            # Update agent status & last heartbeat
            new_agent_status = "executing" if event_type == "run_start" else "healthy"
            await conn.execute(
                """
                UPDATE agent_state
                SET last_heartbeat = ?, status = ?, updated_at = ?
                WHERE agent_id = ?
                """,
                (ts, new_agent_status, now, agent_id),
            )
            stored_count += 1

        await conn.commit()

    # Evaluate AEGIS supervisory rules on ingested events
    for ev in raw_events:
        await aegis_supervisor.evaluate_event(ev)
        await sse_manager.broadcast("event_ingested", ev)

    return stored_count
