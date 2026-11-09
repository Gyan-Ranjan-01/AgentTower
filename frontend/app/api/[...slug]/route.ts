import { NextResponse } from "next/server";
import {
  mockAgents,
  mockIncidents,
  mockCost,
  mockEvents,
} from "@/lib/mockData";
import {
  fallbackManagerAgent,
  fallbackMonitoringBots,
  fallbackPricingCatalog,
  fallbackActivityLogs,
  getFallbackAdaptiveState,
  MonitoringBot,
} from "@/lib/fallbackStore";

export const dynamic = "force-dynamic";

const BACKEND_PORT = process.env.AGENTTOWER_PORT || "8001";
const BACKEND_BASE = `http://127.0.0.1:${BACKEND_PORT}/api`;

async function forwardToBackend(req: Request, slugPath: string, method: string) {
  try {
    const url = new URL(req.url);
    const targetUrl = `${BACKEND_BASE}/${slugPath}${url.search}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);

    const init: RequestInit = {
      method,
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
      },
      signal: controller.signal,
    };

    if (method !== "GET" && method !== "HEAD") {
      try {
        const bodyText = await req.text();
        if (bodyText) init.body = bodyText;
      } catch (e) {}
    }

    const res = await fetch(targetUrl, init);
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch (e) {
    // Backend unavailable or running in standalone Vercel environment
  }
  return null;
}

export async function GET(req: Request, { params }: { params: { slug: string[] } }) {
  const slugPath = params.slug.join("/");

  // Try real backend first
  const forwarded = await forwardToBackend(req, slugPath, "GET");
  if (forwarded) return forwarded;

  // Fallback resilient mock responses
  if (slugPath === "health") {
    return NextResponse.json({
      status: "ok",
      version: "1.0.0",
      llm_mode: "scripted",
      backend: "resilient_edge",
      database: "sqlite_wal_synced",
    });
  }

  if (slugPath === "adaptive-intelligence") {
    return NextResponse.json(getFallbackAdaptiveState());
  }

  if (slugPath === "models/pricing") {
    return NextResponse.json({
      rates_per_million_tokens: {
        models: fallbackPricingCatalog.reduce((acc, m) => {
          acc[m.model_id] = {
            tier: m.tier,
            category: m.category,
            description: m.description,
            input_usd: m.input_usd_per_m,
            output_usd: m.output_usd_per_m,
          };
          return acc;
        }, {} as Record<string, any>),
      },
      catalog: fallbackPricingCatalog,
    });
  }

  if (slugPath === "agents") {
    return NextResponse.json(mockAgents);
  }

  if (slugPath === "incidents") {
    return NextResponse.json(mockIncidents);
  }

  if (slugPath.startsWith("incidents/")) {
    const id = slugPath.split("/")[1];
    const found = mockIncidents.find((i) => i.incident_id === id) || mockIncidents[0];
    return NextResponse.json({
      ...found,
      remediation_plan_id: "plan-v4-remed-01",
    });
  }

  if (slugPath === "cost") {
    return NextResponse.json(mockCost);
  }

  if (slugPath === "events") {
    return NextResponse.json(mockEvents);
  }

  if (slugPath === "gate/requests") {
    return NextResponse.json([
      {
        request_id: "gate-v6-restart",
        agent_id: "it_agent",
        tool_name: "restart_service",
        arguments: { service: "kubernetes_control_plane", force: true },
        policy_reason: "High-risk infrastructure restart requires Site Reliability Lead authorization.",
        status: "held",
        created_at: new Date().toISOString(),
      },
    ]);
  }

  if (slugPath.startsWith("remediation/plans/")) {
    const planId = slugPath.split("/")[2] || "plan-v4-remed-01";
    return NextResponse.json({
      plan_id: planId,
      incident_id: "INC-RET-84f55bed",
      target_agent_id: "finance_agent",
      probable_root_cause: "Retriever configuration allowed scope 'hr' leading to cross-department data exposure.",
      proposed_diff: "- allowed_departments: ['finance', 'hr']\n+ allowed_departments: ['finance']",
      plan_hash_sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      status: "pending_review",
      permission_token: null,
      validation_result: null,
    });
  }

  if (slugPath.startsWith("lineage/")) {
    return NextResponse.json({
      trace_id: "trc-orchestrator-full-flow",
      nodes: [
        { id: "user", type: "input", data: { label: "User Request: FY26 Audit & Infra Sync" }, position: { x: 250, y: 0 } },
        { id: "orch", data: { label: "Multi-Agent Orchestrator (Custom)" }, position: { x: 250, y: 100 } },
        { id: "fin", data: { label: "Finance RAG Analyst (LangChain)" }, position: { x: 100, y: 220 } },
        { id: "it", data: { label: "IT Diagnostics Specialist (CrewAI)" }, position: { x: 400, y: 220 } },
        { id: "report", type: "output", data: { label: "Executive Synthesis & Audit Report" }, position: { x: 250, y: 340 } },
      ],
      edges: [
        { id: "e1", source: "user", target: "orch", animated: true },
        { id: "e2", source: "orch", target: "fin" },
        { id: "e3", source: "orch", target: "it" },
        { id: "e4", source: "fin", target: "report" },
        { id: "e5", source: "it", target: "report" },
      ],
    });
  }

  if (slugPath === "audit") {
    return NextResponse.json([
      {
        log_id: "aud-001",
        timestamp: new Date().toISOString(),
        action: "DECISION_GATE_EVALUATED",
        actor: "decision_gate_policy",
        details: "Held restart_service call on it_agent pending human authorization.",
        hmac_signature: "a4f89d32b5e1c074",
      },
      {
        log_id: "aud-002",
        timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
        action: "REMEDIATION_PLAN_SYNTHESIZED",
        actor: "aegis_supervisor",
        details: "Plan plan-v4-remed-01 SHA256 e3b0c44298fc generated for INC-RET-84f55bed.",
        hmac_signature: "8f7e21a30b49c5d2",
      },
    ]);
  }

  return NextResponse.json({ error: `Fallback endpoint /api/${slugPath} not found` }, { status: 404 });
}

export async function POST(req: Request, { params }: { params: { slug: string[] } }) {
  const slugPath = params.slug.join("/");

  // Try real backend first
  const forwarded = await forwardToBackend(req, slugPath, "POST");
  if (forwarded) return forwarded;

  // Fallback mutation handlers
  if (slugPath === "adaptive-intelligence/bot-mode") {
    try {
      const body = await req.json();
      const { bot_id, mode } = body;
      if (fallbackMonitoringBots[bot_id]) {
        const bot = fallbackMonitoringBots[bot_id];
        bot.operating_mode = mode;
        if (mode === "Premium") {
          bot.assigned_model = "gpt-4o";
          bot.intelligence_tier = "Tier 3: High-Capability Frontier";
        } else if (mode === "Standard") {
          bot.assigned_model = bot.base_model;
          bot.intelligence_tier = "Tier 1: Lightweight + Event Handoff";
        } else {
          bot.assigned_model = bot.base_model;
          bot.intelligence_tier = "Tier 1: Lightweight";
        }

        fallbackActivityLogs.unshift({
          log_id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: `Operating Mode Changed: ${mode}`,
          bot_id,
          details: `${bot.name} switched to ${mode} mode using ${bot.assigned_model}.`,
          type: mode === "Premium" ? "upgrade" : "config",
        });
      }
      return NextResponse.json(getFallbackAdaptiveState());
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 400 });
    }
  }

  if (slugPath === "adaptive-intelligence/temporary-upgrade") {
    try {
      const body = await req.json();
      const { bot_id, duration_minutes = 30 } = body;
      if (fallbackMonitoringBots[bot_id]) {
        const bot = fallbackMonitoringBots[bot_id];
        bot.is_premium_temporary = true;
        bot.premium_expires_at = Date.now() + duration_minutes * 60 * 1000;
        bot.assigned_model = "gpt-4o";
        bot.intelligence_tier = "Tier 3: High-Capability Frontier (Temporary)";

        fallbackActivityLogs.unshift({
          log_id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          event: `Temporary Premium Upgrade (${duration_minutes}m)`,
          bot_id,
          details: `${bot.name} temporarily elevated to gpt-4o for deep investigation.`,
          type: "upgrade",
        });
      }
      return NextResponse.json(getFallbackAdaptiveState());
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 400 });
    }
  }

  if (slugPath.includes("/decision")) {
    return NextResponse.json({
      status: "approved",
      authorized_by: "Engineering Supervisor",
      resumed_at: new Date().toISOString(),
    });
  }

  if (slugPath.includes("/approve")) {
    return NextResponse.json({
      plan_id: "plan-v4-remed-01",
      status: "executed",
      hmac_token_issued: "tok-hmac-98a2f4c01",
      validation_result: "PASS: Finance documents accessible, HR documents strictly prohibited.",
      resolved_at: new Date().toISOString(),
    });
  }

  if (slugPath === "demo/reset") {
    return NextResponse.json({
      status: "reset_complete",
      duration_s: 0.05,
      message: "AgentTower restored to clean baseline state.",
    });
  }

  if (slugPath === "demo/inject") {
    return NextResponse.json({
      success: true,
      scenario: "V4: Cross-Department Retrieval",
      incident_id: "INC-RET-84f55bed",
      severity: "Critical",
    });
  }

  return NextResponse.json({ status: "acknowledged" });
}
