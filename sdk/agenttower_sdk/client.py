from __future__ import annotations
import os
import time
import json
import uuid
import queue
import atexit
import logging
import threading
import datetime
from typing import Any, Dict, Optional, Callable
import httpx

from sdk.agenttower_sdk.context import (
    get_current_trace_id,
    get_current_span_id,
    get_current_parent_span_id,
    get_current_run_id,
    get_current_agent_id,
    get_current_task_id,
    run_context,
    span_context,
    trace_context
)

logger = logging.getLogger("agenttower_sdk")
DEFAULT_PORT = os.getenv("AGENTTOWER_PORT", "8001")
DEFAULT_INGEST_URL = os.getenv("AGENTTOWER_API_URL", f"http://127.0.0.1:{DEFAULT_PORT}/api/events")
DEFAULT_GATE_URL = os.getenv("AGENTTOWER_GATE_URL", f"http://127.0.0.1:{DEFAULT_PORT}/api/gate/requests")


class AgentTowerClient:
    def __init__(self, ingest_url: str = DEFAULT_INGEST_URL, batch_size: int = 10, flush_interval_s: float = 0.5):
        self.ingest_url = ingest_url
        self.batch_size = batch_size
        self.flush_interval_s = flush_interval_s
        self._queue: queue.Queue = queue.Queue(maxsize=5000)
        self._stop_event = threading.Event()
        self._worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self._worker_thread.start()
        atexit.register(self.flush)

    def emit(
        self,
        event_type: str,
        agent_id: Optional[str] = None,
        tool_name: Optional[str] = None,
        status: str = "success",
        input_tokens: int = 0,
        output_tokens: int = 0,
        model: Optional[str] = None,
        duration_ms: float = 0.0,
        attributes: Optional[Dict[str, Any]] = None,
        framework: str = "custom",
        trace_id: Optional[str] = None,
        span_id: Optional[str] = None,
        parent_span_id: Optional[str] = None,
        run_id: Optional[str] = None,
        task_id: Optional[str] = None,
    ) -> None:
        """Asynchronously emit a canonical event. Never raises exceptions into the caller."""
        try:
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            event = {
                "event_id": f"ev-{uuid.uuid4().hex[:12]}",
                "organization_id": "org-default",
                "agent_id": agent_id or get_current_agent_id(),
                "framework": framework,
                "run_id": run_id or get_current_run_id(),
                "task_id": task_id or get_current_task_id(),
                "trace_id": trace_id or get_current_trace_id(),
                "span_id": span_id or get_current_span_id(),
                "parent_span_id": parent_span_id or get_current_parent_span_id(),
                "event_type": event_type,
                "tool_name": tool_name,
                "status": status,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "model": model or "scripted-mock-v1",
                "duration_ms": duration_ms,
                "timestamp": now_iso,
                "attributes": attributes or {}
            }
            self._queue.put_nowait(event)
        except Exception as e:
            logger.debug(f"AgentTower SDK emit failed silently: {e}")

    def flush(self, timeout: float = 2.0) -> None:
        """Flushes remaining queued events to the ingest endpoint."""
        start = time.time()
        while not self._queue.empty() and (time.time() - start) < timeout:
            self._send_batch()
            time.sleep(0.05)

    def _worker_loop(self) -> None:
        while not self._stop_event.is_set():
            try:
                self._send_batch()
                time.sleep(self.flush_interval_s)
            except Exception:
                time.sleep(0.2)

    def _send_batch(self) -> None:
        items = []
        while len(items) < self.batch_size:
            try:
                item = self._queue.get_nowait()
                items.append(item)
            except queue.Empty:
                break

        if not items:
            return

        try:
            with httpx.Client(timeout=1.0) as client:
                resp = client.post(self.ingest_url, json={"events": items})
                if resp.status_code == 200:
                    return
        except Exception:
            pass

        # Standalone / In-Process fallback when HTTP server is offline
        try:
            import asyncio
            from concurrent.futures import ThreadPoolExecutor
            from backend.ingest.service import process_incoming_events

            def _execute_coro(coro):
                return asyncio.run(coro)

            with ThreadPoolExecutor(max_workers=1) as pool:
                pool.submit(_execute_coro, process_incoming_events(items)).result()
        except Exception as e:
            logger.debug(f"AgentTower SDK direct ingest fallback failed: {e}")

    def gate(
        self,
        tool_name: str,
        tool_fn: Callable[..., Any],
        parameters: Optional[Dict[str, Any]] = None,
        agent_id: Optional[str] = None,
        cost_so_far_usd: float = 0.05,
        timeout_seconds: int = 60,
        *args: Any,
        **kwargs: Any
    ) -> Any:
        """
        Decision Gate SDK wrapper.
        Holds execution of gated tools until human approval is granted.
        """
        params = parameters or kwargs or {}
        a_id = agent_id or get_current_agent_id()
        r_id = get_current_run_id()
        t_id = get_current_trace_id()

        # Check if Decision Gate holds this tool
        request_id = f"gate-{uuid.uuid4().hex[:8]}"
        payload = {
            "request_id": request_id,
            "agent_id": a_id,
            "run_id": r_id,
            "trace_id": t_id,
            "tool_name": tool_name,
            "parameters": params,
            "cost_so_far_usd": cost_so_far_usd,
            "timeout_seconds": timeout_seconds
        }

        # Emit gate_request event
        self.emit(
            event_type="gate_request",
            agent_id=a_id,
            tool_name=tool_name,
            status="pending",
            attributes={"request_id": request_id, "parameters": params}
        )

        decision = "reject"
        try:
            with httpx.Client(timeout=3.0) as client:
                resp = client.post(DEFAULT_GATE_URL, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    # If auto-approved (e.g. non-gated tool)
                    if data.get("status") == "Approved":
                        decision = "approve"
                    else:
                        # Poll for human approval in UI
                        poll_start = time.time()
                        while (time.time() - poll_start) < timeout_seconds:
                            time.sleep(0.5)
                            poll_resp = client.get(f"{DEFAULT_GATE_URL}/{request_id}")
                            if poll_resp.status_code == 200:
                                p_data = poll_resp.json()
                                if p_data.get("status") == "Approved":
                                    decision = "approve"
                                    break
                                elif p_data.get("status") in ["Rejected", "TimedOut"]:
                                    decision = "reject"
                                    break
        except Exception as e:
            logger.warning(f"Decision Gate communication exception: {e}")
            decision = "reject"

        # Emit gate_decision event
        self.emit(
            event_type="gate_decision",
            agent_id=a_id,
            tool_name=tool_name,
            status="success" if decision == "approve" else "blocked",
            attributes={"request_id": request_id, "decision": decision}
        )

        if decision == "approve":
            return tool_fn(*args, **kwargs)
        else:
            raise PermissionError(f"Decision Gate rejected or timed out action for tool: '{tool_name}'")


# Singleton SDK instance
sdk_client = AgentTowerClient()
emit = sdk_client.emit
gate = sdk_client.gate
