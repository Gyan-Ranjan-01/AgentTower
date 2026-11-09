export interface MonitoringBot {
  bot_id: string;
  name: string;
  target_agent: string;
  framework: string;
  department: string;
  base_model: string;
  assigned_model: string;
  intelligence_tier: string;
  operating_mode: "Economy" | "Standard" | "Premium";
  is_premium_temporary: boolean;
  premium_expires_at: number | null;
  tokens_used_24h: number;
  est_daily_cost_usd: number;
  status: string;
  monitoring_tasks: string[];
}

export const fallbackManagerAgent = {
  agent_id: "aegis_supervisor_agent",
  name: "AEGIS Strategic Supervisor",
  framework: "AEGIS / LangChain Sovereign",
  role: "Supervisory Correlation & Governed Remediation Orchestrator",
  assigned_model: "gpt-4o",
  intelligence_tier: "Tier 3: High-Capability Frontier",
  operating_mode: "Continuous Sovereign Supervision",
  status: "Active Supervisor",
  token_budget_24h: 100000,
  tokens_used_24h: 45200,
  est_daily_cost_usd: 0.282,
  capabilities: [
    "Cross-agent causal DAG correlation",
    "Automated root-cause hypothesis generation",
    "Cryptographic HMAC remediation synthesis",
    "Decision Gate escalation arbitration",
  ],
};

export const fallbackMonitoringBots: Record<string, MonitoringBot> = {
  finance_sentinel_bot: {
    bot_id: "finance_sentinel_bot",
    name: "Finance Compliance Sentinel",
    target_agent: "finance_agent",
    framework: "LangChain",
    department: "Finance",
    base_model: "gpt-4o-mini",
    assigned_model: "gpt-4o-mini",
    intelligence_tier: "Tier 1: Lightweight",
    operating_mode: "Economy",
    is_premium_temporary: false,
    premium_expires_at: null,
    tokens_used_24h: 124500,
    est_daily_cost_usd: 0.046,
    status: "Healthy & Monitoring",
    monitoring_tasks: [
      "RAG retrieval boundary scoping",
      "Cross-department document access audit",
      "Token budget overrun surveillance",
    ],
  },
  it_infra_monitor_bot: {
    bot_id: "it_infra_monitor_bot",
    name: "IT Infrastructure Sentinel",
    target_agent: "it_agent",
    framework: "CrewAI",
    department: "IT Operations",
    base_model: "gemini-1.5-flash",
    assigned_model: "gemini-1.5-flash",
    intelligence_tier: "Tier 1: Lightweight",
    operating_mode: "Standard",
    is_premium_temporary: false,
    premium_expires_at: null,
    tokens_used_24h: 210000,
    est_daily_cost_usd: 0.038,
    status: "Healthy & Monitoring",
    monitoring_tasks: [
      "Heartbeat pulse verification (30s interval)",
      "Subprocess latency spike triage",
      "Restricted tool invocation hold",
    ],
  },
  hr_privacy_guard_bot: {
    bot_id: "hr_privacy_guard_bot",
    name: "HR Privacy & PII Guard",
    target_agent: "hr_agent",
    framework: "AutoGen",
    department: "Human Resources",
    base_model: "claude-3-haiku",
    assigned_model: "claude-3-haiku",
    intelligence_tier: "Tier 1: Lightweight",
    operating_mode: "Economy",
    is_premium_temporary: false,
    premium_expires_at: null,
    tokens_used_24h: 88000,
    est_daily_cost_usd: 0.044,
    status: "Healthy & Monitoring",
    monitoring_tasks: [
      "Executive compensation masking",
      "PII data pattern detection",
      "Prompt-injection heuristic analysis",
    ],
  },
  workflow_tracer_bot: {
    bot_id: "workflow_tracer_bot",
    name: "Distributed Workflow Tracer",
    target_agent: "orchestrator_agent",
    framework: "AgentTower Native SDK",
    department: "Cross-Functional",
    base_model: "llama-3.1-8b",
    assigned_model: "llama-3.1-8b",
    intelligence_tier: "Tier 1: Lightweight",
    operating_mode: "Standard",
    is_premium_temporary: false,
    premium_expires_at: null,
    tokens_used_24h: 320000,
    est_daily_cost_usd: 0.048,
    status: "Healthy & Monitoring",
    monitoring_tasks: [
      "Execution loop detection (3x hash)",
      "Span duration latency accumulation",
      "Parent-child trace graph integrity",
    ],
  },
};

export const fallbackPricingCatalog = [
  {
    model_id: "gpt-4o",
    tier: "Tier 3: High-Capability Frontier",
    category: "Manager / Supervisor",
    description: "Multimodal frontier model used for supervisor correlation and root cause analysis.",
    input_usd_per_m: 2.50,
    output_usd_per_m: 10.00,
    active_instances: 1,
    is_running: true,
  },
  {
    model_id: "gpt-4o-mini",
    tier: "Tier 1: Lightweight",
    category: "Continuous Monitoring Bot",
    description: "Ultra-fast low-cost model for routine log parsing and boundary checks.",
    input_usd_per_m: 0.15,
    output_usd_per_m: 0.60,
    active_instances: 1,
    is_running: true,
  },
  {
    model_id: "gemini-1.5-flash",
    tier: "Tier 1: Lightweight",
    category: "Continuous Monitoring Bot",
    description: "Low-latency model with massive context window for fast log stream auditing.",
    input_usd_per_m: 0.075,
    output_usd_per_m: 0.30,
    active_instances: 1,
    is_running: true,
  },
  {
    model_id: "claude-3-haiku",
    tier: "Tier 1: Lightweight",
    category: "Continuous Monitoring Bot",
    description: "Compact Claude model optimized for instant response and PII masking.",
    input_usd_per_m: 0.25,
    output_usd_per_m: 1.25,
    active_instances: 1,
    is_running: true,
  },
  {
    model_id: "llama-3.1-8b",
    tier: "Tier 1: Lightweight",
    category: "Continuous Monitoring Bot",
    description: "Open-weights efficient model for local execution loop and hash checks.",
    input_usd_per_m: 0.10,
    output_usd_per_m: 0.20,
    active_instances: 1,
    is_running: true,
  },
  {
    model_id: "claude-3-5-sonnet",
    tier: "Tier 3: High-Capability Frontier",
    category: "Investigation Escalation",
    description: "Benchmark-leading reasoning model for complex forensic code investigation.",
    input_usd_per_m: 3.00,
    output_usd_per_m: 15.00,
    active_instances: 0,
    is_running: false,
  },
  {
    model_id: "gemini-1.5-pro",
    tier: "Tier 3: High-Capability Frontier",
    category: "Investigation Escalation",
    description: "Frontier reasoning model for 2M token cross-agent trace auditing.",
    input_usd_per_m: 1.25,
    output_usd_per_m: 5.00,
    active_instances: 0,
    is_running: false,
  },
];

export const fallbackActivityLogs = [
  {
    log_id: "act-01",
    timestamp: new Date().toISOString(),
    event: "System Baseline Initialized",
    bot_id: "all",
    details: "Routine monitoring initialized on Economy & Standard tiers using lightweight models.",
    type: "info",
  },
  {
    log_id: "act-02",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    event: "AEGIS Supervisor Correlation",
    bot_id: "aegis_supervisor_agent",
    details: "Manager Agent verified zero false alarms on 32 baseline agent traces.",
    type: "info",
  },
];

// Helper to calculate three-stage pipeline stats dynamically
export function getFallbackAdaptiveState() {
  const botsList = Object.values(fallbackMonitoringBots);
  const totalBotsCost = botsList.reduce((acc, b) => acc + b.est_daily_cost_usd, 0);
  const managerCost = fallbackManagerAgent.est_daily_cost_usd;
  const totalDailyCost = Number((totalBotsCost + managerCost).toFixed(4));
  const totalTokens = botsList.reduce((acc, b) => acc + b.tokens_used_24h, 0) + fallbackManagerAgent.tokens_used_24h;
  const allFrontierCost = Number(((totalTokens / 1000000) * 12.5).toFixed(4));
  const savingsPct = Number((((allFrontierCost - totalDailyCost) / allFrontierCost) * 100).toFixed(1));

  return {
    manager_agent: fallbackManagerAgent,
    monitoring_bots: botsList,
    three_stage_pipeline: {
      stage_1_rules: {
        name: "Stage 1: Deterministic Rule-Based Checks",
        description: "Heartbeat delta, exact tool hash, boundary allow-lists",
        cost_usd: 0.0,
        resolution_rate_pct: 84.5,
        model: "Zero-Token In-Memory Rules Engine",
      },
      stage_2_small_llm: {
        name: "Stage 2: Lightweight Small-LLM Analysis",
        description: "Log triage, prompt injection heuristics, anomaly classification",
        cost_usd: Number(totalBotsCost.toFixed(4)),
        resolution_rate_pct: 13.5,
        model: "gpt-4o-mini / gemini-1.5-flash / claude-3-haiku",
      },
      stage_3_frontier_llm: {
        name: "Stage 3: Powerful Frontier LLM Investigation",
        description: "Multi-agent causal correlation & HMAC remediation synthesis",
        cost_usd: Number(managerCost.toFixed(4)),
        resolution_rate_pct: 2.0,
        model: fallbackManagerAgent.assigned_model,
      },
      total_daily_spend_usd: totalDailyCost,
      all_frontier_cost_usd: allFrontierCost,
      cost_reduction_pct: savingsPct,
    },
    activity_logs: fallbackActivityLogs,
  };
}
