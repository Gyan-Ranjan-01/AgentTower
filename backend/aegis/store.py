from __future__ import annotations
import json
from typing import Dict, Any, List, Optional
from backend.app.db import get_db_connection


class ReadOnlyStore:
    """Strictly read-only data access layer for the AEGIS supervisor.

    Has no write operations to agent configuration, no write access to permission
    tokens or remediation management, and cannot issue control commands.
    """

    async def get_agent_config(self, agent_id: str) -> Optional[Dict[str, Any]]:
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM agent_state WHERE agent_id = ?", (agent_id,)
            )
            row = await cursor.fetchone()
            if not row:
                return None
            return {
                "agent_id": row["agent_id"],
                "name": row["name"],
                "framework": row["framework"],
                "department": row["department"],
                "team": row["team"],
                "owner": row["owner"],
                "allowed_tools": json.loads(row["allowed_tools"]),
                "allowed_departments": json.loads(row["allowed_departments"]),
                "token_budget_per_run": row["token_budget_per_run"],
                "heartbeat_interval_s": row["heartbeat_interval_s"],
                "last_heartbeat": row["last_heartbeat"],
                "status": row["status"]
            }

    async def get_recent_tool_events(
        self, agent_id: str, limit: int = 20
    ) -> List[Dict[str, Any]]:
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT * FROM events
                WHERE agent_id = ? AND event_type = 'tool_call'
                ORDER BY timestamp DESC LIMIT ?
                """,
                (agent_id, limit),
            )
            rows = await cursor.fetchall()
            return [
                {
                    "event_id": r["event_id"],
                    "agent_id": r["agent_id"],
                    "tool_name": r["tool_name"],
                    "timestamp": r["timestamp"],
                    "attributes": json.loads(r["attributes"]) if r["attributes"] else {}
                }
                for r in rows
            ]

    async def get_run_events(self, run_id: str) -> List[Dict[str, Any]]:
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                "SELECT * FROM events WHERE run_id = ? ORDER BY timestamp ASC",
                (run_id,),
            )
            rows = await cursor.fetchall()
            return [
                {
                    "event_id": r["event_id"],
                    "agent_id": r["agent_id"],
                    "event_type": r["event_type"],
                    "tool_name": r["tool_name"],
                    "status": r["status"],
                    "input_tokens": r["input_tokens"],
                    "output_tokens": r["output_tokens"],
                    "timestamp": r["timestamp"],
                    "attributes": json.loads(r["attributes"]) if r["attributes"] else {}
                }
                for r in rows
            ]

    async def get_historical_run_token_usage(
        self, agent_id: str, limit: int = 50
    ) -> List[int]:
        """Returns total token usage per run for the last N runs."""
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                """
                SELECT run_id, SUM(input_tokens + output_tokens) as total_tokens
                FROM events
                WHERE agent_id = ? AND run_id IS NOT NULL AND run_id != ''
                GROUP BY run_id
                ORDER BY MIN(timestamp) DESC
                LIMIT ?
                """,
                (agent_id, limit),
            )
            rows = await cursor.fetchall()
            return [int(r["total_tokens"]) for r in rows if r["total_tokens"] is not None]

    async def get_active_incident_keys(self) -> List[str]:
        async with get_db_connection() as conn:
            cursor = await conn.execute(
                "SELECT agent_id || ':' || rule_id as k FROM incidents WHERE status = 'Active'"
            )
            rows = await cursor.fetchall()
            return [r["k"] for r in rows]
