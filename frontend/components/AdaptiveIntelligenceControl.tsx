"use client";

import React, { useEffect, useState } from "react";
import {
  Cpu,
  Zap,
  TrendingDown,
  Shield,
  Crown,
  Clock,
  Sparkles,
  ArrowUpRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
} from "lucide-react";

interface MonitoringBot {
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

import { getFallbackAdaptiveState } from "@/lib/fallbackStore";

export function AdaptiveIntelligenceControl() {
  const [data, setData] = useState<any>(() => getFallbackAdaptiveState());
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tempDurations, setTempDurations] = useState<Record<string, number>>({
    finance_sentinel_bot: 30,
    it_infra_monitor_bot: 30,
    hr_privacy_guard_bot: 30,
    workflow_tracer_bot: 30,
  });

  const fetchState = async () => {
    try {
      const res = await fetch("/api/adaptive-intelligence");
      if (res.ok) {
        const d = await res.json();
        if (d && d.monitoring_bots && d.monitoring_bots.length > 0) {
          setData(d);
          return;
        }
      }
      setData((prev: any) => prev || getFallbackAdaptiveState());
    } catch (err) {
      setData((prev: any) => prev || getFallbackAdaptiveState());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleModeChange = async (botId: string, newMode: string) => {
    setActionLoading(`mode-${botId}`);
    try {
      const res = await fetch("/api/adaptive-intelligence/bot-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: botId, mode: newMode }),
      });
      const updated = await res.json();
      setData(updated);
    } catch (err) {
      alert("Failed to update operating mode: " + err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTemporaryUpgrade = async (botId: string) => {
    const duration = tempDurations[botId] || 30;
    setActionLoading(`temp-${botId}`);
    try {
      const res = await fetch("/api/adaptive-intelligence/temporary-upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_id: botId, duration_minutes: duration }),
      });
      const updated = await res.json();
      setData(updated);
    } catch (err) {
      alert("Failed to trigger temporary upgrade: " + err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="clay-card p-8 text-center text-slate-500 font-medium">
        Loading Adaptive Intelligence & Cost Optimization engine...
      </div>
    );
  }

  const manager = data?.manager_agent;
  const bots: MonitoringBot[] = data?.monitoring_bots || [];
  const pipeline = data?.three_stage_pipeline;
  const logs = data?.activity_logs || [];

  return (
    <div className="space-y-8">
      {/* 3-Stage Pipeline Cost Optimization Banner */}
      <div className="clay-card p-6 relative overflow-hidden bg-gradient-to-r from-emerald-50/70 via-blue-50/50 to-indigo-50/70 border border-emerald-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200/70">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>Three-Stage Cost Optimization Architecture</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Adaptive Intelligence & Model Cost Control
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl font-medium">
              Eliminates the cost of querying frontier models for 100% of telemetry. Routine tasks are filtered by rules and lightweight models; only verified anomalies escalate to sovereign frontier LLMs.
            </p>
          </div>

          {/* Cost Savings Pill */}
          <div className="clay-card p-4 bg-white/90 border border-emerald-300 shadow-md flex items-center space-x-4 shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center clay-inset">
              <TrendingDown className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Estimated Savings</div>
              <div className="text-2xl font-black text-emerald-600 tracking-tight">
                {pipeline?.cost_reduction_pct || 96.2}%
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                ${pipeline?.total_daily_spend_usd?.toFixed(3)}/day vs ${pipeline?.all_frontier_cost_usd?.toFixed(2)}/day
              </div>
            </div>
          </div>
        </div>

        {/* 3 Pipeline Stages Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          {/* Stage 1 */}
          <div className="clay-inset p-4 rounded-2xl bg-white/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                Stage 1 • Rules Engine
              </span>
              <span className="text-xs font-black text-emerald-700 font-mono">$0.00 / 0 Tok</span>
            </div>
            <h4 className="text-sm font-bold text-slate-800">{pipeline?.stage_1_rules?.name}</h4>
            <p className="text-xs text-slate-600 font-medium">
              Deterministic allow-lists, heartbeat checking & input hashes.
            </p>
            <div className="text-[11px] font-bold text-slate-500 pt-1">
              Resolves <strong className="text-slate-800">{pipeline?.stage_1_rules?.resolution_rate_pct}%</strong> of raw events with zero LLM API calls.
            </div>
          </div>

          {/* Stage 2 */}
          <div className="clay-inset p-4 rounded-2xl bg-white/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                Stage 2 • Small LLMs
              </span>
              <span className="text-xs font-black text-blue-700 font-mono">
                ${pipeline?.stage_2_small_llm?.cost_usd?.toFixed(3)}/day
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-800">{pipeline?.stage_2_small_llm?.name}</h4>
            <p className="text-xs text-slate-600 font-medium">
              Lightweight models (`gpt-4o-mini`, `gemini-1.5-flash`) for triage and log parsing.
            </p>
            <div className="text-[11px] font-bold text-slate-500 pt-1">
              Resolves <strong className="text-slate-800">{pipeline?.stage_2_small_llm?.resolution_rate_pct}%</strong> of nuanced anomalies at ~1/20th the cost.
            </div>
          </div>

          {/* Stage 3 */}
          <div className="clay-inset p-4 rounded-2xl bg-white/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                Stage 3 • Frontier LLM
              </span>
              <span className="text-xs font-black text-purple-700 font-mono">
                ${pipeline?.stage_3_frontier_llm?.cost_usd?.toFixed(3)}/day
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-800">{pipeline?.stage_3_frontier_llm?.name}</h4>
            <p className="text-xs text-slate-600 font-medium">
              `gpt-4o` / `claude-3-5-sonnet` exclusively for causal DAGs & remediation.
            </p>
            <div className="text-[11px] font-bold text-slate-500 pt-1">
              Only <strong className="text-purple-700">{pipeline?.stage_3_frontier_llm?.resolution_rate_pct}%</strong> of incidents escalate to sovereign models.
            </div>
          </div>
        </div>
      </div>

      {/* Manager / Supervisor Agent (Displayed Separately) */}
      {manager && (
        <div className="clay-card p-6 border-2 border-purple-200/90 relative overflow-hidden bg-gradient-to-r from-purple-50/40 via-white to-indigo-50/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-purple-100 pb-4 mb-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center clay-inset shadow-xs">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-black text-slate-800">{manager.name}</span>
                  <span className="clay-pill px-2.5 py-0.5 text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 uppercase">
                    Central Supervisor
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-0.5">{manager.role}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="clay-inset px-3 py-1.5 rounded-xl bg-white text-xs font-mono">
                <span className="text-slate-400">Assigned Model: </span>
                <strong className="text-purple-700 font-bold">{manager.assigned_model}</strong>
              </div>
              <div className="clay-inset px-3 py-1.5 rounded-xl bg-white text-xs font-mono">
                <span className="text-slate-400">Est. Spend: </span>
                <strong className="text-emerald-600 font-bold">${manager.est_daily_cost_usd}/day</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="clay-inset p-3 rounded-xl bg-white/70">
              <span className="text-slate-500 font-bold block mb-1">Intelligence Tier</span>
              <span className="text-purple-700 font-bold">{manager.intelligence_tier}</span>
            </div>
            <div className="clay-inset p-3 rounded-xl bg-white/70">
              <span className="text-slate-500 font-bold block mb-1">Operating Mode</span>
              <span className="text-slate-800 font-bold">{manager.operating_mode}</span>
            </div>
            <div className="clay-inset p-3 rounded-xl bg-white/70">
              <span className="text-slate-500 font-bold block mb-1">Token Throughput (24h)</span>
              <span className="text-indigo-600 font-bold font-mono">
                {manager.tokens_used_24h.toLocaleString()} / {manager.token_budget_24h.toLocaleString()}
              </span>
            </div>
            <div className="clay-inset p-3 rounded-xl bg-white/70">
              <span className="text-slate-500 font-bold block mb-1">Supervisory Status</span>
              <span className="text-emerald-700 font-bold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                {manager.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Continuous Monitoring Bots Fleet (Per-bot Mode & Premium Upgrade) */}
      <div className="clay-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <span>Continuous Monitoring Bots Fleet</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Configure per-bot operating tier or trigger temporary deep-investigation upgrades
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {bots.length} Active Monitoring Agents
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {bots.map((bot) => {
            const isBusy = actionLoading === `mode-${bot.bot_id}` || actionLoading === `temp-${bot.bot_id}`;
            const selectedDuration = tempDurations[bot.bot_id] || 30;

            return (
              <div
                key={bot.bot_id}
                className={`clay-card p-5 border transition-all ${
                  bot.is_premium_temporary
                    ? "border-purple-300 bg-purple-50/20 shadow-md"
                    : bot.operating_mode === "Premium"
                    ? "border-purple-200"
                    : "border-slate-200/80"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <h4 className="text-base font-bold text-slate-800">{bot.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                        Target: {bot.target_agent}
                      </span>
                      {bot.is_premium_temporary && (
                        <span className="clay-pill text-[9px] font-black uppercase text-purple-700 bg-purple-100 border border-purple-200 px-2 py-0.5 flex items-center space-x-1 animate-pulse">
                          <Sparkles className="w-3 h-3" />
                          <span>Temporary Premium Active</span>
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      Department: <strong className="text-slate-700">{bot.department}</strong> • Framework: <strong className="text-slate-700">{bot.framework}</strong>
                    </div>
                  </div>

                  {/* Mode Selector Pills */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-500 mr-1">Operating Mode:</span>
                    {(["Economy", "Standard", "Premium"] as const).map((m) => {
                      const isActive = bot.operating_mode === m && !bot.is_premium_temporary;
                      return (
                        <button
                          key={m}
                          onClick={() => handleModeChange(bot.bot_id, m)}
                          disabled={isBusy}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? m === "Premium"
                                ? "bg-purple-600 text-white shadow-sm"
                                : m === "Standard"
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-emerald-600 text-white shadow-sm"
                              : "clay-btn text-slate-600 hover:text-slate-900"
                          } disabled:opacity-50`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bot Details & Temporary Upgrade Controls */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-3 items-center">
                  <div className="md:col-span-7 grid grid-cols-3 gap-3 text-xs">
                    <div className="clay-inset p-2.5 rounded-xl bg-slate-50/80">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Model</span>
                      <strong className="text-slate-800 font-mono text-xs">{bot.assigned_model}</strong>
                    </div>
                    <div className="clay-inset p-2.5 rounded-xl bg-slate-50/80">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Tokens (24h)</span>
                      <strong className="text-indigo-600 font-mono text-xs">{bot.tokens_used_24h.toLocaleString()}</strong>
                    </div>
                    <div className="clay-inset p-2.5 rounded-xl bg-slate-50/80">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Est. Daily Cost</span>
                      <strong className="text-emerald-600 font-mono text-xs">${bot.est_daily_cost_usd.toFixed(4)}</strong>
                    </div>
                  </div>

                  {/* Temporary Upgrade Action Strip */}
                  <div className="md:col-span-5 flex items-center justify-end space-x-2">
                    <div className="flex items-center space-x-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={selectedDuration}
                        onChange={(e) =>
                          setTempDurations((prev) => ({ ...prev, [bot.bot_id]: Number(e.target.value) }))
                        }
                        className="clay-inset px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
                      >
                        <option value={15}>15 mins</option>
                        <option value={30}>30 mins</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleTemporaryUpgrade(bot.bot_id)}
                      disabled={isBusy}
                      className="clay-btn inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 hover:text-purple-900 border border-purple-200/80 transition-transform shadow-xs disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>{bot.is_premium_temporary ? "Extend Premium" : "Temp Upgrade"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity Log (Upgrades & Downgrades Audit Trail) */}
      <div className="clay-card p-6 space-y-3">
        <h3 className="text-base font-bold text-slate-800 flex items-center space-x-2">
          <History className="w-4 h-4 text-blue-600" />
          <span>Intelligence Tier Activity & Transition Log</span>
        </h3>

        <div className="clay-inset p-3.5 rounded-2xl bg-slate-50 space-y-2 max-h-56 overflow-y-auto">
          {logs.map((log: any) => (
            <div
              key={log.log_id}
              className="flex items-center justify-between py-1.5 border-b border-slate-200/60 font-mono text-[11px] last:border-b-0"
            >
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    log.type === "upgrade"
                      ? "bg-purple-100 text-purple-800"
                      : log.type === "downgrade"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {log.type.toUpperCase()}
                </span>
                <span className="text-slate-800 font-bold">{log.event}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600 font-medium truncate max-w-md">{log.details}</span>
              </div>
              <span className="text-slate-400 text-[10px]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

