from __future__ import annotations
import os
import json
import asyncio
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.app.db import init_db, reset_db, get_db_connection
from backend.app.schemas import (
    CanonicalEvent,
    EventBatch,
    GateDecisionRequest,
    GateRequestSchema,
)
from backend.app.sse import sse_manager
from backend.llm import get_llm_mode
from backend.ingest.service import process_incoming_events
from backend.cost.engine import cost_engine
from backend.lineage.builder import lineage_builder
from backend.gate.service import gate_service
from backend.remediation.manager import remediation_manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB on startup
    await init_db()
    # Start background task for periodic heartbeat checks
    heartbeat_task = asyncio.create_task(heartbeat_monitor_loop())
    yield
    heartbeat_task.cancel()


async def heartbeat_monitor_loop():
    """Periodic background monitor evaluating heartbeat intervals across registered agents."""
    while True:
        try:
            await asyncio.sleep(5.0)
            await aegis_supervisor.check_all_agent_heartbeats()
        except asyncio.CancelledError:
            break
        except Exception:
            await asyncio.sleep(5.0)


app = FastAPI(
    title="AgentTower Control Plane API",
    description="Framework-Agnostic Governance, Monitoring and Remediation Control Plane for AI Agents",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "AgentTower Control Plane",
        "llm_mode": get_llm_mode(),
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }


@app.get("/api/sse")
async def sse_endpoint():
    """Server-Sent Events real-time event stream."""
    queue = await sse_manager.subscribe()
    return StreamingResponse(
        sse_manager.event_generator(queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/events")
async def ingest_events(payload: Dict[str, Any], background_tasks: BackgroundTasks):
    """
    Ingest endpoint accepting a single canonical event or a batch under 'events'.
    Saves to SQLite, updates agent state, triggers AEGIS evaluation, and broadcasts via SSE.
    """
    raw_events: List[Dict[str, Any]] = []
    if "events" in payload and isinstance(payload["events"], list):
        raw_events = payload["events"]
    elif "event_id" in payload:
        raw_events = [payload]
    else:
        raise HTTPException(status_code=400, detail="Payload must contain 'events' array or an event object.")

    stored_count = await process_incoming_events(raw_events)
    return {"status": "ok", "ingested_count": stored_count}


@app.get("/api/events")
async def list_events(
    agent_id: Optional[str] = None,
    trace_id: Optional[str] = None,
    run_id: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    query = "SELECT * FROM events WHERE 1=1"
    params = []
    if agent_id:
        query += " AND agent_id = ?"
        params.append(agent_id)
    if trace_id:
        query += " AND trace_id = ?"
        params.append(trace_id)
    if run_id:
        query += " AND run_id = ?"
        params.append(run_id)
    if event_type:
        query += " AND event_type = ?"
        params.append(event_type)

    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    async with get_db_connection() as conn:
        cursor = await conn.execute(query, tuple(params))
        rows = await cursor.fetchall()
        return [
            {
                "id": r["id"],
                "event_id": r["event_id"],
                "agent_id": r["agent_id"],
                "framework": r["framework"],
                "run_id": r["run_id"],
                "task_id": r["task_id"],
                "trace_id": r["trace_id"],
                "span_id": r["span_id"],
                "parent_span_id": r["parent_span_id"],
                "event_type": r["event_type"],
                "tool_name": r["tool_name"],
                "status": r["status"],
                "input_tokens": r["input_tokens"],
                "output_tokens": r["output_tokens"],
                "model": r["model"],
                "duration_ms": r["duration_ms"],
                "timestamp": r["timestamp"],
                "attributes": json.loads(r["attributes"]) if r["attributes"] else {}
            }
            for r in rows
        ]


@app.get("/api/agents")
async def list_agents():
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT * FROM agent_state ORDER BY agent_id ASC")
        rows = await cursor.fetchall()
        return [
            {
                "agent_id": r["agent_id"],
                "name": r["name"],
                "framework": r["framework"],
                "department": r["department"],
                "team": r["team"],
                "owner": r["owner"],
                "allowed_tools": json.loads(r["allowed_tools"]) if r["allowed_tools"] else [],
                "allowed_departments": json.loads(r["allowed_departments"]) if r["allowed_departments"] else [],
                "token_budget_per_run": r["token_budget_per_run"],
                "heartbeat_interval_s": r["heartbeat_interval_s"],
                "last_heartbeat": r["last_heartbeat"],
                "status": r["status"],
                "updated_at": r["updated_at"]
            }
            for r in rows
        ]


@app.get("/api/agents/{agent_id}")
async def get_agent_detail(agent_id: str):
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT * FROM agent_state WHERE agent_id = ?", (agent_id,))
        r = await cursor.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Agent not found")

        # Get aggregate stats
        stats_cursor = await conn.execute(
            """
            SELECT COUNT(DISTINCT run_id) as total_runs,
                   SUM(input_tokens + output_tokens) as total_tokens,
                   AVG(duration_ms) as avg_duration_ms
            FROM events WHERE agent_id = ?
            """,
            (agent_id,)
        )
        stats = await stats_cursor.fetchone()

        # Get active incident count
        inc_cursor = await conn.execute(
            "SELECT COUNT(*) as active_incidents FROM incidents WHERE agent_id = ? AND status = 'Active'",
            (agent_id,)
        )
        inc_count = (await inc_cursor.fetchone())["active_incidents"]

        return {
            "agent_id": r["agent_id"],
            "name": r["name"],
            "framework": r["framework"],
            "department": r["department"],
            "team": r["team"],
            "owner": r["owner"],
            "allowed_tools": json.loads(r["allowed_tools"]) if r["allowed_tools"] else [],
            "allowed_departments": json.loads(r["allowed_departments"]) if r["allowed_departments"] else [],
            "token_budget_per_run": r["token_budget_per_run"],
            "heartbeat_interval_s": r["heartbeat_interval_s"],
            "last_heartbeat": r["last_heartbeat"],
            "status": r["status"],
            "updated_at": r["updated_at"],
            "stats": {
                "total_runs": stats["total_runs"] or 0,
                "total_tokens": stats["total_tokens"] or 0,
                "avg_duration_ms": round(stats["avg_duration_ms"] or 0.0, 2),
                "active_incidents": inc_count
            }
        }


@app.get("/api/incidents")
async def list_incidents(status: Optional[str] = None):
    query = "SELECT * FROM incidents WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY id DESC" if "id" in query else " ORDER BY timestamp DESC"

    async with get_db_connection() as conn:
        cursor = await conn.execute(query, tuple(params))
        rows = await cursor.fetchall()
        return [
            {
                "incident_id": r["incident_id"],
                "agent_id": r["agent_id"],
                "timestamp": r["timestamp"],
                "severity": r["severity"],
                "confidence": r["confidence"],
                "title": r["title"],
                "description": r["description"],
                "rule_id": r["rule_id"],
                "evidence_event_ids": json.loads(r["evidence_event_ids"]) if r["evidence_event_ids"] else [],
                "trace_id": r["trace_id"],
                "potential_impact": r["potential_impact"],
                "recommended_action": r["recommended_action"],
                "status": r["status"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"]
            }
            for r in rows
        ]


@app.get("/api/incidents/{incident_id}")
async def get_incident_detail(incident_id: str):
    async with get_db_connection() as conn:
        cursor = await conn.execute("SELECT * FROM incidents WHERE incident_id = ?", (incident_id,))
        r = await cursor.fetchone()
        if not r:
            raise HTTPException(status_code=404, detail="Incident not found")

        ev_ids = json.loads(r["evidence_event_ids"]) if r["evidence_event_ids"] else []
        evidence_events = []
        if ev_ids:
            placeholders = ",".join("?" for _ in ev_ids)
            ev_cursor = await conn.execute(
                f"SELECT * FROM events WHERE event_id IN ({placeholders})", tuple(ev_ids)
            )
            ev_rows = await ev_cursor.fetchall()
            evidence_events = [
                {
                    "event_id": ev["event_id"],
                    "agent_id": ev["agent_id"],
                    "event_type": ev["event_type"],
                    "tool_name": ev["tool_name"],
                    "status": ev["status"],
                    "timestamp": ev["timestamp"],
                    "attributes": json.loads(ev["attributes"]) if ev["attributes"] else {}
                }
                for ev in ev_rows
            ]

        # Check if remediation plan exists
        plan_cursor = await conn.execute(
            "SELECT plan_id, status FROM remediation_plans WHERE incident_id = ?", (incident_id,)
        )
        plan_row = await plan_cursor.fetchone()

        return {
            "incident_id": r["incident_id"],
            "agent_id": r["agent_id"],
            "timestamp": r["timestamp"],
            "severity": r["severity"],
            "confidence": r["confidence"],
            "title": r["title"],
            "description": r["description"],
            "rule_id": r["rule_id"],
            "evidence_event_ids": ev_ids,
            "evidence_events": evidence_events,
            "trace_id": r["trace_id"],
            "potential_impact": r["potential_impact"],
            "recommended_action": r["recommended_action"],
            "status": r["status"],
            "created_at": r["created_at"],
            "updated_at": r["updated_at"],
            "remediation_plan_id": plan_row["plan_id"] if plan_row else None,
            "remediation_plan_status": plan_row["status"] if plan_row else None
        }


@app.get("/api/lineage/{trace_id}")
async def get_lineage(trace_id: str):
    return await lineage_builder.build_trace_dag(trace_id)


@app.get("/api/cost")
async def get_cost_breakdown():
    """Calculates granular real cost attribution by agent, team, and task from database events."""
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            """
            SELECT e.agent_id, e.task_id, e.model, e.input_tokens, e.output_tokens,
                   a.team, a.department
            FROM events e
            LEFT JOIN agent_state a ON e.agent_id = a.agent_id
            WHERE e.input_tokens > 0 OR e.output_tokens > 0
            """
        )
        rows = await cursor.fetchall()

    by_agent: Dict[str, Dict[str, Any]] = {}
    by_team: Dict[str, Dict[str, Any]] = {}
    by_task: Dict[str, Dict[str, Any]] = {}
    total_cost = 0.0
    total_tokens = 0

    for r in rows:
        inp = r["input_tokens"] or 0
        outp = r["output_tokens"] or 0
        toks = inp + outp
        cost = cost_engine.calculate_cost(r["model"], inp, outp)

        total_cost += cost
        total_tokens += toks

        # By Agent
        ag = r["agent_id"] or "unknown"
        if ag not in by_agent:
            by_agent[ag] = {"agent_id": ag, "tokens": 0, "cost_usd": 0.0, "events": 0}
        by_agent[ag]["tokens"] += toks
        by_agent[ag]["cost_usd"] = round(by_agent[ag]["cost_usd"] + cost, 4)
        by_agent[ag]["events"] += 1

        # By Team
        tm = r["team"] or r["department"] or "General"
        if tm not in by_team:
            by_team[tm] = {"team": tm, "tokens": 0, "cost_usd": 0.0, "events": 0}
        by_team[tm]["tokens"] += toks
        by_team[tm]["cost_usd"] = round(by_team[tm]["cost_usd"] + cost, 4)
        by_team[tm]["events"] += 1

        # By Task
        tsk = r["task_id"] or "default_task"
        if tsk not in by_task:
            by_task[tsk] = {"task_id": tsk, "tokens": 0, "cost_usd": 0.0, "events": 0}
        by_task[tsk]["tokens"] += toks
        by_task[tsk]["cost_usd"] = round(by_task[tsk]["cost_usd"] + cost, 4)
        by_task[tsk]["events"] += 1

    return {
        "by_agent": by_agent,
        "by_team": by_team,
        "by_task": by_task,
        "total_cost_usd": round(total_cost, 4),
        "total_tokens": total_tokens
    }


# Decision Gate Endpoints
@app.post("/api/gate/requests")
async def create_gate_request(req: Dict[str, Any]):
    return await gate_service.submit_request(
        request_id=req.get("request_id") or f"gate-{datetime.datetime.now().timestamp()}",
        agent_id=req.get("agent_id", "unknown"),
        run_id=req.get("run_id", ""),
        trace_id=req.get("trace_id", ""),
        tool_name=req.get("tool_name", ""),
        parameters=req.get("parameters", {}),
        cost_so_far_usd=float(req.get("cost_so_far_usd") or 0.0),
        timeout_seconds=int(req.get("timeout_seconds") or 60)
    )


@app.get("/api/gate/requests")
async def list_gate_requests(status: Optional[str] = None):
    query = "SELECT * FROM gate_requests WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY created_at DESC"

    async with get_db_connection() as conn:
        cursor = await conn.execute(query, tuple(params))
        rows = await cursor.fetchall()
        return [
            {
                "request_id": r["request_id"],
                "agent_id": r["agent_id"],
                "run_id": r["run_id"],
                "trace_id": r["trace_id"],
                "tool_name": r["tool_name"],
                "parameters": json.loads(r["parameters"]) if r["parameters"] else {},
                "cost_so_far_usd": r["cost_so_far_usd"],
                "status": r["status"],
                "timeout_at": r["timeout_at"],
                "decided_by": r["decided_by"],
                "decided_at": r["decided_at"],
                "decision_reason": r["decision_reason"],
                "created_at": r["created_at"]
            }
            for r in rows
        ]


@app.get("/api/gate/requests/{request_id}")
async def get_gate_request(request_id: str):
    req = await gate_service.get_request(request_id)
    if not req:
        raise HTTPException(status_code=404, detail="Gate request not found")
    return req


@app.post("/api/gate/requests/{request_id}/decision")
async def decide_gate_request(request_id: str, payload: GateDecisionRequest):
    return await gate_service.decide_request(
        request_id=request_id,
        decision=payload.decision,
        decided_by=payload.decided_by,
        reason=payload.reason
    )


# Remediation Endpoints
@app.post("/api/remediation/propose")
async def propose_remediation(payload: Dict[str, Any]):
    incident_id = payload.get("incident_id")
    if not incident_id:
        raise HTTPException(status_code=400, detail="Missing 'incident_id'")
    return await remediation_manager.propose_plan(incident_id)


@app.get("/api/remediation/plans/{plan_id}")
async def get_remediation_plan(plan_id: str):
    plan = await remediation_manager.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@app.post("/api/remediation/plans/{plan_id}/approve")
async def approve_remediation_plan(plan_id: str, payload: Optional[Dict[str, Any]] = None):
    actor = (payload or {}).get("actor", "Alice Chen (VP Finance)")
    return await remediation_manager.approve_and_execute(plan_id, actor=actor)


# Audit & Replay Endpoints
@app.get("/api/audit")
async def get_audit_log(limit: int = 50):
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT * FROM audit_log ORDER BY audit_id DESC LIMIT ?", (limit,)
        )
        rows = await cursor.fetchall()
        return [
            {
                "audit_id": r["audit_id"],
                "timestamp": r["timestamp"],
                "action_type": r["action_type"],
                "actor": r["actor"],
                "target_agent_id": r["target_agent_id"],
                "details": json.loads(r["details"]) if r["details"] else {},
                "plan_hash": r["plan_hash"],
                "token_id": r["token_id"],
                "status": r["status"]
            }
            for r in rows
        ]


@app.get("/api/replay/{run_id}")
async def get_run_replay(run_id: str):
    """
    Returns the step-by-step event sequence for audit replay.
    Note: Audit replay reconstructs recorded events; it does not re-run the LLM.
    """
    async with get_db_connection() as conn:
        cursor = await conn.execute(
            "SELECT * FROM events WHERE run_id = ? ORDER BY timestamp ASC, id ASC", (run_id,)
        )
        rows = await cursor.fetchall()
        events = [
            {
                "event_id": r["event_id"],
                "agent_id": r["agent_id"],
                "event_type": r["event_type"],
                "tool_name": r["tool_name"],
                "status": r["status"],
                "input_tokens": r["input_tokens"],
                "output_tokens": r["output_tokens"],
                "model": r["model"],
                "duration_ms": r["duration_ms"],
                "timestamp": r["timestamp"],
                "attributes": json.loads(r["attributes"]) if r["attributes"] else {}
            }
            for r in rows
        ]
        return {
            "run_id": run_id,
            "events_count": len(events),
            "disclaimer": "Audit replay reconstructs recorded events; it does not re-run the LLM.",
            "events": events
        }


# Demo Control Endpoints
@app.post("/api/demo/reset")
async def demo_reset():
    """Fast clean reset restored in under 10 seconds."""
    await reset_db()
    # Also reload AEGIS and Gate configs
    aegis_supervisor.reload_config()
    gate_service.reload_policy()
    await sse_manager.broadcast("demo_reset", {"status": "reset_complete"})
    return {"status": "ok", "message": "Database and agent configurations reset to nominal baseline."}


@app.post("/api/demo/inject")
async def demo_inject(payload: Dict[str, Any]):
    scenario_id = payload.get("scenario_id") or payload.get("scenario")
    if not scenario_id:
        raise HTTPException(status_code=400, detail="Missing scenario_id (V1..V8)")

    # Execute injection dynamically via scripts/inject.py helper
    from scripts.inject import run_scenario
    result = await asyncio.to_thread(run_scenario, scenario_id)
    return result
