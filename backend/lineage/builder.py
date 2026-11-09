from __future__ import annotations
import json
from typing import Dict, Any, List
from backend.app.db import get_db_connection


class LineageBuilder:
    async def build_trace_dag(self, trace_id: str) -> Dict[str, Any]:
        """Constructs React Flow compatible nodes and edges from recorded trace spans."""
        async with get_db_connection() as conn:
            # 1. Fetch all events for this trace
            cursor = await conn.execute(
                "SELECT * FROM events WHERE trace_id = ? ORDER BY timestamp ASC, id ASC",
                (trace_id,),
            )
            rows = await cursor.fetchall()

            # 2. Fetch incidents associated with this trace
            inc_cursor = await conn.execute(
                "SELECT incident_id, severity, title, evidence_event_ids FROM incidents WHERE trace_id = ?",
                (trace_id,),
            )
            inc_rows = await inc_cursor.fetchall()

        if not rows:
            return {"nodes": [], "edges": [], "summary": {"total_events": 0, "total_tokens": 0, "total_duration_ms": 0}}

        incident_ev_map = {}
        for inc in inc_rows:
            ev_ids = json.loads(inc["evidence_event_ids"]) if inc["evidence_event_ids"] else []
            for eid in ev_ids:
                incident_ev_map[eid] = {
                    "incident_id": inc["incident_id"],
                    "severity": inc["severity"],
                    "title": inc["title"]
                }

        nodes = []
        edges = []
        span_ids_seen = set()
        total_tokens = 0
        total_duration = 0.0

        for idx, r in enumerate(rows):
            span_id = r["span_id"]
            if span_id in span_ids_seen:
                continue
            span_ids_seen.add(span_id)

            inp = r["input_tokens"] or 0
            outp = r["output_tokens"] or 0
            tokens = inp + outp
            total_tokens += tokens
            dur = r["duration_ms"] or 0.0
            total_duration += dur

            inc_info = incident_ev_map.get(r["event_id"])
            attrs = json.loads(r["attributes"]) if r["attributes"] else {}

            label = f"{r['agent_id']}"
            if r["tool_name"]:
                label += f" → {r['tool_name']}"
            elif r["event_type"] == "retrieval":
                label += " → RAG Retrieval"
            elif r["event_type"] == "llm_call":
                label += f" → LLM ({r['model'] or 'model'})"
            elif r["event_type"] == "run_start":
                label += " → Workflow Start"
            elif r["event_type"] == "run_end":
                label += " → Output Generated"

            nodes.append({
                "id": span_id,
                "data": {
                    "label": label,
                    "agent_id": r["agent_id"],
                    "event_type": r["event_type"],
                    "tool_name": r["tool_name"],
                    "status": r["status"],
                    "duration_ms": dur,
                    "tokens": tokens,
                    "model": r["model"],
                    "timestamp": r["timestamp"],
                    "attributes": attrs,
                    "incident": inc_info
                },
                "position": {"x": 250 * (idx % 3), "y": 120 * idx}
            })

            parent_id = r["parent_span_id"]
            if parent_id and parent_id != span_id:
                edges.append({
                    "id": f"e-{parent_id}-{span_id}",
                    "source": parent_id,
                    "target": span_id,
                    "animated": inc_info is not None,
                    "style": {"stroke": "#ef4444" if inc_info else "#3b82f6"}
                })
            elif idx > 0:
                # Sequential connection if no explicit parent span
                prev_id = rows[idx - 1]["span_id"]
                if prev_id != span_id:
                    edges.append({
                        "id": f"e-{prev_id}-{span_id}",
                        "source": prev_id,
                        "target": span_id,
                        "animated": False,
                        "style": {"stroke": "#64748b"}
                    })

        return {
            "nodes": nodes,
            "edges": edges,
            "summary": {
                "trace_id": trace_id,
                "total_events": len(rows),
                "total_tokens": total_tokens,
                "total_duration_ms": round(total_duration, 2),
                "incident_count": len(inc_rows)
            }
        }


lineage_builder = LineageBuilder()
