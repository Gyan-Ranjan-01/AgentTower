from __future__ import annotations
import time
import hashlib
from typing import Any, Dict, List, Optional
from uuid import UUID
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.outputs import LLMResult

from sdk.agenttower_sdk.client import sdk_client
from sdk.agenttower_sdk.context import (
    get_current_trace_id,
    get_current_task_id,
)


class AgentTowerLangChainCallbackHandler(BaseCallbackHandler):
    """LangChain callback handler that instruments chains, LLMs, tools, and retrievers into canonical AgentTower events."""

    def __init__(self, agent_id: str = "finance_agent"):
        super().__init__()
        self.agent_id = agent_id
        self._start_times: Dict[str, float] = {}

    def on_chain_start(
        self,
        serialized: Dict[str, Any],
        inputs: Dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        self._start_times[str(run_id)] = time.time()
        sdk_client.emit(
            event_type="run_start",
            agent_id=self.agent_id,
            framework="langchain",
            run_id=str(run_id),
            span_id=str(run_id),
            parent_span_id=str(parent_run_id) if parent_run_id else None,
            trace_id=get_current_trace_id(),
            task_id=get_current_task_id(),
            attributes={"inputs_keys": list(inputs.keys()) if isinstance(inputs, dict) else []}
        )

    def on_chain_end(
        self,
        outputs: Dict[str, Any],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        start_t = self._start_times.pop(str(run_id), time.time())
        duration = round((time.time() - start_t) * 1000, 2)
        out_str = str(outputs) if outputs else ""
        sdk_client.emit(
            event_type="run_end",
            agent_id=self.agent_id,
            framework="langchain",
            run_id=str(run_id),
            span_id=str(run_id),
            parent_span_id=str(parent_run_id) if parent_run_id else None,
            trace_id=get_current_trace_id(),
            task_id=get_current_task_id(),
            duration_ms=duration,
            status="success",
            attributes={"output_length": len(out_str), "output_size": len(out_str)}
        )

    def on_chain_error(
        self,
        error: BaseException,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        start_t = self._start_times.pop(str(run_id), time.time())
        duration = round((time.time() - start_t) * 1000, 2)
        sdk_client.emit(
            event_type="run_end",
            agent_id=self.agent_id,
            framework="langchain",
            run_id=str(run_id),
            span_id=str(run_id),
            parent_span_id=str(parent_run_id) if parent_run_id else None,
            trace_id=get_current_trace_id(),
            task_id=get_current_task_id(),
            duration_ms=duration,
            status="error",
            attributes={"error_type": type(error).__name__, "error_message": str(error)}
        )

    def on_llm_start(
        self,
        serialized: Dict[str, Any],
        prompts: List[str],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        self._start_times[str(run_id)] = time.time()

    def on_llm_end(
        self,
        response: LLMResult,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        start_t = self._start_times.pop(str(run_id), time.time())
        duration = round((time.time() - start_t) * 1000, 2)

        # Extract token usage from LLMResult if present
        input_tokens = 0
        output_tokens = 0
        model = "scripted-mock-v1"
        if response.llm_output:
            token_usage = response.llm_output.get("token_usage", {})
            input_tokens = token_usage.get("prompt_tokens", 0)
            output_tokens = token_usage.get("completion_tokens", 0)
            model = response.llm_output.get("model_name", model)

        # Fallback estimation if 0
        if input_tokens == 0:
            input_tokens = 120
            output_tokens = 80

        sdk_client.emit(
            event_type="llm_call",
            agent_id=self.agent_id,
            framework="langchain",
            span_id=str(run_id),
            parent_span_id=str(parent_run_id) if parent_run_id else None,
            trace_id=get_current_trace_id(),
            task_id=get_current_task_id(),
            duration_ms=duration,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=model,
            status="success"
        )

    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        inputs: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        self._start_times[str(run_id)] = time.time()
        tool_name = serialized.get("name") or kwargs.get("name", "unknown_tool")
        input_hash = hashlib.sha256(str(input_str).encode("utf-8")).hexdigest()[:12]
        sdk_client.emit(
            event_type="tool_call",
            agent_id=self.agent_id,
            framework="langchain",
            tool_name=tool_name,
            span_id=str(run_id),
            parent_span_id=str(parent_run_id) if parent_run_id else None,
            trace_id=get_current_trace_id(),
            task_id=get_current_task_id(),
            attributes={"input_hash": input_hash, "query": str(input_str)[:100]}
        )

    def on_tool_end(
        self,
        output: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        start_t = self._start_times.pop(str(run_id), time.time())
        duration = round((time.time() - start_t) * 1000, 2)
        # Check if output contains retrieval or swallowed errors
        swallowed = False
        if "error" in str(output).lower() and "exception" in str(output).lower():
            swallowed = True

        sdk_client.emit(
            event_type="tool_call",
            agent_id=self.agent_id,
            framework="langchain",
            span_id=str(run_id),
            parent_span_id=str(parent_run_id) if parent_run_id else None,
            trace_id=get_current_trace_id(),
            task_id=get_current_task_id(),
            duration_ms=duration,
            status="success",
            attributes={"output_size": len(str(output)), "swallowed_error": swallowed}
        )

    def on_retriever_start(
        self,
        serialized: Dict[str, Any],
        query: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> None:
        self._start_times[str(run_id)] = time.time()

    def on_retriever_end(
        self,
        documents: List[Any],
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        **kwargs: Any,
    ) -> None:
        start_t = self._start_times.pop(str(run_id), time.time())
        duration = round((time.time() - start_t) * 1000, 2)

        doc_ids = []
        departments = []
        retrieved_snippets = []

        for d in documents:
            meta = getattr(d, "metadata", {})
            doc_id = meta.get("doc_id", meta.get("id", "doc_unknown"))
            dept = meta.get("department", "finance")
            doc_ids.append(doc_id)
            departments.append(dept)
            content = getattr(d, "page_content", str(d))
            retrieved_snippets.append(content[:120])

        sdk_client.emit(
            event_type="retrieval",
            agent_id=self.agent_id,
            framework="langchain",
            span_id=str(run_id),
            parent_span_id=str(parent_run_id) if parent_run_id else None,
            trace_id=get_current_trace_id(),
            task_id=get_current_task_id(),
            duration_ms=duration,
            attributes={
                "document_ids": doc_ids,
                "document_departments": list(set(departments)),
                "document_count": len(documents),
                "retrieved_text": " ".join(retrieved_snippets)
            }
        )
