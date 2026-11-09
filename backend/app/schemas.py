from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
import datetime


class CanonicalEvent(BaseModel):
    event_id: str
    organization_id: str = "org-default"
    agent_id: str
    framework: str = "custom"
    run_id: str
    task_id: str
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None
    event_type: str  # run_start, run_end, llm_call, tool_call, retrieval, agent_call, heartbeat, error, gate_request, gate_decision
    tool_name: Optional[str] = None
    status: str = "success"  # success, error, pending, blocked
    input_tokens: int = 0
    output_tokens: int = 0
    model: Optional[str] = None
    duration_ms: float = 0.0
    timestamp: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    attributes: Dict[str, Any] = Field(default_factory=dict)


class EventBatch(BaseModel):
    events: List[CanonicalEvent]


class IncidentSchema(BaseModel):
    incident_id: str
    agent_id: str
    timestamp: str
    severity: str  # Critical, Medium, Low
    confidence: float = 1.0  # 0.0 to 1.0
    title: str
    description: str
    rule_id: str
    evidence_event_ids: List[str] = Field(default_factory=list)
    trace_id: Optional[str] = None
    potential_impact: str
    recommended_action: str
    status: str = "Active"  # Active, In Remediation, Resolved, Dismissed


class GateDecisionRequest(BaseModel):
    decision: str  # "approve" or "reject"
    decided_by: str = "Alice Chen (VP Finance)"
    reason: Optional[str] = None


class GateRequestSchema(BaseModel):
    request_id: str
    agent_id: str
    run_id: str
    trace_id: str
    tool_name: str
    parameters: Dict[str, Any]
    cost_so_far_usd: float
    status: str  # Pending, Approved, Rejected, TimedOut
    timeout_at: str
    decided_by: Optional[str] = None
    decided_at: Optional[str] = None
    decision_reason: Optional[str] = None
    created_at: str


class RemediationPlanProposal(BaseModel):
    plan_id: str
    incident_id: str
    agent_id: str
    summary: str
    probable_root_cause: str
    evidence: List[Dict[str, Any]]
    proposed_modifications: List[str]
    step_by_step_procedure: List[str]
    config_changes: Dict[str, Any]
    expected_result: str
    risks_and_side_effects: str
    expected_downtime: str
    required_permissions: List[str]
    validation_tests: List[Dict[str, Any]]
    rollback_strategy: Dict[str, Any]
    plan_hash: str
    status: str = "Proposed"
    created_at: str


class PermissionTokenSchema(BaseModel):
    token_id: str
    plan_id: str
    task_id: str
    target_agent_id: str
    permitted_operations: List[str]
    approved_parameters_hash: str
    plan_hash: str
    nonce: str
    expires_at: str
    hmac_signature: str
    used: bool = False
    revoked: bool = False
    created_at: str


class AgentConfigSchema(BaseModel):
    agent_id: str
    name: str
    framework: str
    owner: str
    department: str
    team: str
    allowed_tools: List[str]
    allowed_departments: List[str]
    token_budget_per_run: int
    heartbeat_interval_s: int
    status: str = "healthy"
    last_heartbeat: Optional[str] = None


class CostAttributionSchema(BaseModel):
    by_agent: Dict[str, Dict[str, Any]]
    by_team: Dict[str, Dict[str, Any]]
    by_task: Dict[str, Dict[str, Any]]
    total_cost_usd: float
    total_tokens: int
