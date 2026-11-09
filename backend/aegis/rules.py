from __future__ import annotations
import re
import math
import uuid
import datetime
from typing import Dict, Any, List, Optional


def check_unauthorised_retrieval(
    event: Dict[str, Any], agent_config: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Flags any retrieval event that touches document departments outside the agent's allowed scopes."""
    if event.get("event_type") != "retrieval":
        return None

    allowed_depts = set(agent_config.get("allowed_departments", []))
    attrs = event.get("attributes", {})
    doc_departments = attrs.get("document_departments") or []
    if isinstance(doc_departments, str):
        doc_departments = [doc_departments]

    # Also check single doc_department if provided
    single_dept = attrs.get("doc_department") or attrs.get("department")
    if single_dept and single_dept not in doc_departments:
        doc_departments.append(single_dept)

    unauthorised = [d for d in doc_departments if d not in allowed_depts]
    if unauthorised:
        doc_ids = attrs.get("document_ids", [])
        return {
            "incident_id": f"INC-RET-{uuid.uuid4().hex[:8]}",
            "agent_id": event["agent_id"],
            "timestamp": event.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()),
            "severity": "Critical",
            "confidence": 1.0,
            "title": f"Unauthorised cross-department document access ({', '.join(unauthorised)})",
            "description": (
                f"Agent '{event['agent_id']}' attempted to retrieve documents tagged with department(s) "
                f"{unauthorised}. Agent is only permitted to access: {list(allowed_depts)}."
            ),
            "rule_id": "RULE_UNAUTHORISED_RETRIEVAL",
            "evidence_event_ids": [event["event_id"]],
            "trace_id": event.get("trace_id"),
            "potential_impact": "High risk of sensitive cross-department data exfiltration (e.g. HR salary/personnel leak).",
            "recommended_action": "Revoke unauthorized retrieval scope and run Remediation Manager workflow.",
            "status": "Active"
        }
    return None


def check_unauthorised_tool(
    event: Dict[str, Any], agent_config: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    """Flags any tool invocation that is not present in the agent's allowed_tools list."""
    if event.get("event_type") != "tool_call":
        return None

    tool_name = event.get("tool_name")
    if not tool_name:
        return None

    allowed_tools = set(agent_config.get("allowed_tools", []))
    if tool_name not in allowed_tools:
        return {
            "incident_id": f"INC-TOOL-{uuid.uuid4().hex[:8]}",
            "agent_id": event["agent_id"],
            "timestamp": event.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()),
            "severity": "Critical",
            "confidence": 1.0,
            "title": f"Unauthorised tool execution attempt: '{tool_name}'",
            "description": (
                f"Agent '{event['agent_id']}' attempted to execute tool '{tool_name}', "
                f"which is not in its authorized tool allowlist: {list(allowed_tools)}."
            ),
            "rule_id": "RULE_UNAUTHORISED_TOOL",
            "evidence_event_ids": [event["event_id"]],
            "trace_id": event.get("trace_id"),
            "potential_impact": "Execution of unvetted or restricted system tool actions.",
            "recommended_action": "Block tool execution and enforce Decision Gate policy.",
            "status": "Active"
        }
    return None


def check_execution_loop(
    recent_tool_events: List[Dict[str, Any]],
    max_repeats: int = 3,
    window_seconds: int = 120
) -> Optional[Dict[str, Any]]:
    """Detects repetitive identical tool executions (same tool + same input hash) exceeding threshold."""
    if len(recent_tool_events) < max_repeats:
        return None

    now = datetime.datetime.now(datetime.timezone.utc)
    # Filter within window
    valid_events = []
    for ev in recent_tool_events:
        try:
            ev_time = datetime.datetime.fromisoformat(ev["timestamp"].replace("Z", "+00:00"))
            if (now - ev_time).total_seconds() <= window_seconds:
                valid_events.append(ev)
        except Exception:
            valid_events.append(ev)

    # Group by run_id, tool_name and input_hash (deduplicate by event_id)
    hash_counts: Dict[str, List[str]] = {}
    seen_events = set()
    for ev in valid_events:
        eid = ev.get("event_id")
        if not eid or eid in seen_events:
            continue
        seen_events.add(eid)

        tool_name = ev.get("tool_name")
        if not tool_name:
            continue

        input_hash = ev.get("attributes", {}).get("input_hash")
        if not input_hash:
            continue

        run_id = ev.get("run_id") or "global"
        key = f"{run_id}:{tool_name}:{input_hash}"
        hash_counts.setdefault(key, []).append(eid)

    for key, ev_ids in hash_counts.items():
        if len(ev_ids) >= max_repeats:
            parts = key.split(":")
            tool_name = parts[1] if len(parts) > 1 else "tool"
            agent_id = recent_tool_events[0].get("agent_id", "unknown")
            return {
                "incident_id": f"INC-LOOP-{uuid.uuid4().hex[:8]}",
                "agent_id": agent_id,
                "timestamp": now.isoformat(),
                "severity": "Medium",
                "confidence": 0.95,
                "title": f"Execution loop detected on tool '{tool_name}'",
                "description": (
                    f"Agent '{agent_id}' executed tool '{tool_name}' {len(ev_ids)} times "
                    f"with identical arguments within a {window_seconds}s window."
                ),
                "rule_id": "RULE_EXECUTION_LOOP",
                "evidence_event_ids": ev_ids[:max_repeats],
                "trace_id": recent_tool_events[0].get("trace_id"),
                "potential_impact": "Runaway resource consumption, budget exhaustion, or stalled autonomous workflow.",
                "recommended_action": "Intervene via Decision Gate or apply backoff remediation.",
                "status": "Active"
            }
    return None


def check_token_spike(
    run_events: List[Dict[str, Any]],
    agent_config: Dict[str, Any],
    historical_token_usages: List[int],
    sigma_k: float = 2.0,
    min_sample_size: int = 5
) -> Optional[Dict[str, Any]]:
    """Detects runaway token consumption exceeding budget or k * standard deviation above baseline."""
    total_tokens = sum(
        ev.get("input_tokens", 0) + ev.get("output_tokens", 0)
        for ev in run_events
    )

    budget = agent_config.get("token_budget_per_run", 3000)
    agent_id = agent_config.get("agent_id", "unknown")
    run_id = run_events[0].get("run_id") if run_events else "unknown"
    trace_id = run_events[0].get("trace_id") if run_events else None

    # Check 1: Strict budget breach
    if total_tokens > budget:
        evidence = [ev["event_id"] for ev in run_events if (ev.get("input_tokens", 0) + ev.get("output_tokens", 0)) > 0]
        return {
            "incident_id": f"INC-TOK-{uuid.uuid4().hex[:8]}",
            "agent_id": agent_id,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "severity": "Medium",
            "confidence": 1.0,
            "title": f"Token budget exceeded: {total_tokens} > {budget} tokens",
            "description": (
                f"Run '{run_id}' consumed {total_tokens} tokens, exceeding configured per-run "
                f"limit of {budget} tokens for agent '{agent_id}'."
            ),
            "rule_id": "RULE_TOKEN_SPIKE",
            "evidence_event_ids": evidence[:5],
            "trace_id": trace_id,
            "potential_impact": f"Uncontrolled LLM cost overrun. Estimated excess spend for this run.",
            "recommended_action": "Review prompt context length or apply token rate limiter.",
            "status": "Active"
        }

    # Check 2: Statistical anomaly vs baseline
    if len(historical_token_usages) >= min_sample_size:
        n = len(historical_token_usages)
        mean = sum(historical_token_usages) / n
        variance = sum((x - mean) ** 2 for x in historical_token_usages) / (n - 1)
        sigma = math.sqrt(variance)
        threshold = mean + (sigma_k * sigma)
        if total_tokens > threshold and total_tokens > (mean * 1.5):
            evidence = [ev["event_id"] for ev in run_events if (ev.get("input_tokens", 0) + ev.get("output_tokens", 0)) > 0]
            return {
                "incident_id": f"INC-TOK-{uuid.uuid4().hex[:8]}",
                "agent_id": agent_id,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                "severity": "Medium",
                "confidence": 0.88,
                "title": f"Statistical token usage anomaly ({total_tokens} > baseline {int(threshold)})",
                "description": (
                    f"Agent '{agent_id}' token usage ({total_tokens}) exceeded {sigma_k}σ "
                    f"above historical baseline (μ={int(mean)}, σ={int(sigma)})."
                ),
                "rule_id": "RULE_TOKEN_SPIKE",
                "evidence_event_ids": evidence[:5],
                "trace_id": trace_id,
                "potential_impact": "Abnormal conversation drift or oversized prompt injection payload.",
                "recommended_action": "Inspect input context and prompt templates.",
                "status": "Active"
            }
    return None


def check_silent_failure(
    run_events: List[Dict[str, Any]]
) -> Optional[Dict[str, Any]]:
    """Detects silent agent failures: empty output on successful run, or swallowed tool errors."""
    if not run_events:
        return None

    run_end_events = [ev for ev in run_events if ev.get("event_type") == "run_end"]
    if not run_end_events:
        return None

    end_event = run_end_events[-1]
    agent_id = end_event.get("agent_id", "unknown")
    trace_id = end_event.get("trace_id")
    attrs = end_event.get("attributes", {})

    # Case A: Swallowed tool error
    swallowed_errors = [
        ev for ev in run_events
        if ev.get("status") == "error" or ev.get("attributes", {}).get("swallowed_error") is True
    ]
    if end_event.get("status") == "success" and swallowed_errors:
        return {
            "incident_id": f"INC-FAIL-{uuid.uuid4().hex[:8]}",
            "agent_id": agent_id,
            "timestamp": end_event.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()),
            "severity": "Medium",
            "confidence": 0.95,
            "title": f"Silent failure: tool error swallowed in successful run",
            "description": (
                f"Agent '{agent_id}' reported run completion 'success', but 1 or more underlying "
                f"tool execution errors were caught and swallowed without upstream handling."
            ),
            "rule_id": "RULE_SILENT_FAILURE",
            "evidence_event_ids": [swallowed_errors[0]["event_id"], end_event["event_id"]],
            "trace_id": trace_id,
            "potential_impact": "Incomplete or corrupted task execution masked as successful.",
            "recommended_action": "Implement explicit error propagation and fallback handlers.",
            "status": "Active"
        }

    # Case B: Empty output on claimed success
    output_length = attrs.get("output_length", attrs.get("output_size", None))
    if end_event.get("status") == "success" and output_length == 0:
        return {
            "incident_id": f"INC-FAIL-{uuid.uuid4().hex[:8]}",
            "agent_id": agent_id,
            "timestamp": end_event.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()),
            "severity": "Low",
            "confidence": 0.90,
            "title": "Silent failure: empty output produced on completed run",
            "description": f"Agent '{agent_id}' completed execution successfully but returned empty output string.",
            "rule_id": "RULE_SILENT_FAILURE",
            "evidence_event_ids": [end_event["event_id"]],
            "trace_id": trace_id,
            "potential_impact": "Downstream consumers receive blank responses without explicit error.",
            "recommended_action": "Add minimum output schema assertion to agent response pipeline.",
            "status": "Active"
        }

    return None


def check_prompt_injection(
    event: Dict[str, Any],
    patterns: List[str],
    confidence_threshold: float = 0.60
) -> Optional[Dict[str, Any]]:
    """
    Scans retrieved content or input queries for instruction override patterns.
    Reports as an indicator with a confidence score — never asserts a confirmed breach.
    """
    attrs = event.get("attributes", {})
    text_to_scan = ""
    if "retrieved_text" in attrs:
        text_to_scan = str(attrs["retrieved_text"])
    elif "content" in attrs:
        text_to_scan = str(attrs["content"])
    elif "query" in attrs:
        text_to_scan = str(attrs["query"])

    if not text_to_scan:
        return None

    matched_patterns = []
    for pat in patterns:
        if re.search(pat, text_to_scan):
            matched_patterns.append(pat)

    if matched_patterns:
        # Confidence scales with number of matched indicator patterns
        conf = min(0.95, round(confidence_threshold + (len(matched_patterns) * 0.15), 2))
        return {
            "incident_id": f"INC-INJ-{uuid.uuid4().hex[:8]}",
            "agent_id": event["agent_id"],
            "timestamp": event.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()),
            "severity": "Medium",
            "confidence": conf,
            "title": f"Prompt-injection indicator detected (confidence: {conf})",
            "description": (
                f"Retrieved content or query for agent '{event['agent_id']}' matched "
                f"{len(matched_patterns)} adversarial pattern(s). Flagged as a heuristic indicator; "
                f"manual operator validation required."
            ),
            "rule_id": "RULE_PROMPT_INJECTION",
            "evidence_event_ids": [event["event_id"]],
            "trace_id": event.get("trace_id"),
            "potential_impact": "Potential jailbreak, goal hijacking, or instruction overwrite in downstream reasoning.",
            "recommended_action": "Quarantine suspicious retrieved document and inspect vector/index source.",
            "status": "Active"
        }

    return None


def check_heartbeat_timeout(
    agent_config: Dict[str, Any],
    current_time: datetime.datetime,
    multiplier_k: float = 2.5
) -> Optional[Dict[str, Any]]:
    """Checks if an agent's last heartbeat has lapsed beyond k * interval."""
    last_hb_str = agent_config.get("last_heartbeat")
    interval = agent_config.get("heartbeat_interval_s", 10)
    agent_id = agent_config.get("agent_id", "unknown")

    if not last_hb_str:
        return None

    try:
        last_hb = datetime.datetime.fromisoformat(last_hb_str.replace("Z", "+00:00"))
    except Exception:
        return None

    elapsed_s = (current_time - last_hb).total_seconds()
    timeout_limit = interval * multiplier_k

    if elapsed_s > timeout_limit:
        return {
            "incident_id": f"INC-HB-{uuid.uuid4().hex[:8]}",
            "agent_id": agent_id,
            "timestamp": current_time.isoformat(),
            "severity": "Critical",
            "confidence": 1.0,
            "title": f"Agent unavailable: heartbeat missed ({int(elapsed_s)}s elapsed)",
            "description": (
                f"Agent '{agent_id}' has not emitted a heartbeat in {int(elapsed_s)}s "
                f"(threshold: {int(timeout_limit)}s = {multiplier_k}x {interval}s)."
            ),
            "rule_id": "RULE_HEARTBEAT_TIMEOUT",
            "evidence_event_ids": [],
            "trace_id": None,
            "potential_impact": "Agent process is terminated, unresponsive, or experiencing network partition.",
            "recommended_action": "Check process health, restart daemon or failover to secondary worker.",
            "status": "Active"
        }
    return None
