from __future__ import annotations
import time
import functools
import hashlib
from typing import Callable, Any, Optional
from sdk.agenttower_sdk.client import sdk_client
from sdk.agenttower_sdk.context import (
    get_current_trace_id,
    get_current_span_id,
    get_current_parent_span_id,
    get_current_run_id,
    get_current_task_id,
    span_context,
    run_context,
)


def instrument_agent(agent_id: str, framework: str = "custom") -> Callable:
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            with run_context(agent_id):
                run_id = get_current_run_id()
                trace_id = get_current_trace_id()
                task_id = get_current_task_id()
                start_t = time.time()
                sdk_client.emit(
                    event_type="run_start",
                    agent_id=agent_id,
                    framework=framework,
                    run_id=run_id,
                    span_id=run_id,
                    trace_id=trace_id,
                    task_id=task_id,
                    attributes={"args_count": len(args), "kwargs_keys": list(kwargs.keys())}
                )
                try:
                    res = fn(*args, **kwargs)
                    dur = round((time.time() - start_t) * 1000, 2)
                    out_len = len(str(res)) if res is not None else 0
                    sdk_client.emit(
                        event_type="run_end",
                        agent_id=agent_id,
                        framework=framework,
                        run_id=run_id,
                        span_id=run_id,
                        trace_id=trace_id,
                        task_id=task_id,
                        duration_ms=dur,
                        status="success",
                        attributes={"output_length": out_len, "output_size": out_len}
                    )
                    return res
                except Exception as e:
                    dur = round((time.time() - start_t) * 1000, 2)
                    sdk_client.emit(
                        event_type="run_end",
                        agent_id=agent_id,
                        framework=framework,
                        run_id=run_id,
                        span_id=run_id,
                        trace_id=trace_id,
                        task_id=task_id,
                        duration_ms=dur,
                        status="error",
                        attributes={"error_type": type(e).__name__, "error_message": str(e)}
                    )
                    raise
        return wrapper
    return decorator


def instrument_tool(tool_name: str, agent_id: Optional[str] = None, framework: str = "custom") -> Callable:
    def decorator(fn: Callable) -> Callable:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            with span_context() as s_id:
                start_t = time.time()
                in_str = f"{args}-{kwargs}"
                input_hash = hashlib.sha256(in_str.encode("utf-8")).hexdigest()[:12]
                sdk_client.emit(
                    event_type="tool_call",
                    agent_id=agent_id,
                    framework=framework,
                    tool_name=tool_name,
                    span_id=s_id,
                    attributes={"input_hash": input_hash, "query": str(args)[:80]}
                )
                try:
                    res = fn(*args, **kwargs)
                    dur = round((time.time() - start_t) * 1000, 2)
                    sdk_client.emit(
                        event_type="tool_call",
                        agent_id=agent_id,
                        framework=framework,
                        tool_name=tool_name,
                        span_id=s_id,
                        duration_ms=dur,
                        status="success",
                        attributes={"output_size": len(str(res))}
                    )
                    return res
                except Exception as e:
                    dur = round((time.time() - start_t) * 1000, 2)
                    sdk_client.emit(
                        event_type="tool_call",
                        agent_id=agent_id,
                        framework=framework,
                        tool_name=tool_name,
                        span_id=s_id,
                        duration_ms=dur,
                        status="error",
                        attributes={"error_type": type(e).__name__, "error_message": str(e)}
                    )
                    raise
        return wrapper
    return decorator

