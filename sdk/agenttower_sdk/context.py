from __future__ import annotations
import uuid
import contextvars
from contextlib import contextmanager
from typing import Generator, Optional

_current_trace_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_trace_id", default=None)
_current_span_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_span_id", default=None)
_current_parent_span_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_parent_span_id", default=None)
_current_run_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_run_id", default=None)
_current_agent_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_agent_id", default=None)
_current_task_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("current_task_id", default=None)


def get_current_trace_id() -> str:
    tid = _current_trace_id.get()
    if not tid:
        tid = f"trc-{uuid.uuid4().hex[:12]}"
        _current_trace_id.set(tid)
    return tid


def get_current_span_id() -> str:
    sid = _current_span_id.get()
    if not sid:
        sid = f"spn-{uuid.uuid4().hex[:8]}"
        _current_span_id.set(sid)
    return sid


def get_current_parent_span_id() -> Optional[str]:
    return _current_parent_span_id.get()


def get_current_run_id() -> str:
    rid = _current_run_id.get()
    if not rid:
        rid = f"run-{uuid.uuid4().hex[:8]}"
        _current_run_id.set(rid)
    return rid


def get_current_agent_id() -> str:
    return _current_agent_id.get() or "unknown_agent"


def get_current_task_id() -> str:
    return _current_task_id.get() or "default_task"


@contextmanager
def trace_context(trace_id: Optional[str] = None, task_id: Optional[str] = None) -> Generator[None, None, None]:
    t_id = trace_id or f"trc-{uuid.uuid4().hex[:12]}"
    task = task_id or "default_task"
    token_t = _current_trace_id.set(t_id)
    token_task = _current_task_id.set(task)
    try:
        yield
    finally:
        _current_trace_id.reset(token_t)
        _current_task_id.reset(token_task)


@contextmanager
def run_context(agent_id: str, run_id: Optional[str] = None) -> Generator[str, None, None]:
    r_id = run_id or f"run-{uuid.uuid4().hex[:8]}"
    token_a = _current_agent_id.set(agent_id)
    token_r = _current_run_id.set(r_id)
    try:
        yield r_id
    finally:
        _current_agent_id.reset(token_a)
        _current_run_id.reset(token_r)


@contextmanager
def span_context(span_id: Optional[str] = None) -> Generator[str, None, None]:
    parent = _current_span_id.get()
    new_span = span_id or f"spn-{uuid.uuid4().hex[:8]}"
    token_p = _current_parent_span_id.set(parent)
    token_s = _current_span_id.set(new_span)
    try:
        yield new_span
    finally:
        _current_parent_span_id.reset(token_p)
        _current_span_id.reset(token_s)

