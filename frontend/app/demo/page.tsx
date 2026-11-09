"use client";

import React, { useState } from "react";
import {
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  Zap,
  Repeat,
  Flame,
  FileLock2,
  Lock,
  GitMerge,
  Cpu,
  CheckCircle2,
} from "lucide-react";

export default function DemoControlsPage() {
  const [triggering, setTriggering] = useState<string | null>(null);
  const [resetting, setResetting] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any | null>(null);

  const scenarios = [
    {
      id: "V4",
      title: "V4: Flagship — Cross-Department Retrieval",
      description: "Finance RAG agent attempts to retrieve confidential HR executive compensation files. Triggers Critical AEGIS boundary violation.",
      icon: FileLock2,
      color: "border-red-600 bg-red-950/20 text-red-400",
      highlight: true,
    },
    {
      id: "V1",
      title: "V1: Agent Silent Failure / Heartbeat Drop",
      description: "IT support agent stops emitting heartbeats. AEGIS marks agent unavailable and raises an incident.",
      icon: Zap,
      color: "border-amber-600 bg-amber-950/20 text-amber-400",
    },
    {
      id: "V2",
      title: "V2: Autonomous Execution Loop",
      description: "Agent repeats identical tool invocation 3x within 120s with matching input hash. AEGIS flags execution loop.",
      icon: Repeat,
      color: "border-amber-600 bg-amber-950/20 text-amber-400",
    },
    {
      id: "V3",
      title: "V3: Runaway Token Budget Overrun",
      description: "Simulates complex prompt expansion exceeding 2,500 token ceiling. Triggers token-anomaly incident.",
      icon: Flame,
      color: "border-amber-600 bg-amber-950/20 text-amber-400",
    },
    {
      id: "V5",
      title: "V5: Prompt-Injection Indicator",
      description: "Retrieved document contains instruction-override pattern. Flagged with confidence score without claiming confirmed breach.",
      icon: ShieldAlert,
      color: "border-blue-600 bg-blue-950/20 text-blue-400",
    },
    {
      id: "V6",
      title: "V6: Decision Gate Escalation Hold",
      description: "IT agent invokes restricted restart_service tool. Execution is paused and submitted to Decision Gate queue.",
      icon: Lock,
      color: "border-indigo-600 bg-indigo-950/20 text-indigo-400",
    },
    {
      id: "V7",
      title: "V7: Governed Remediation Pipeline",
      description: "Runs plan proposal, issues HMAC-signed token, and commits configuration mutation with post-remediation validation.",
      icon: CheckCircle2,
      color: "border-emerald-600 bg-emerald-950/20 text-emerald-400",
    },
    {
      id: "V8",
      title: "V8: Three-Agent Workflow Trace",
      description: "Executes Orchestrator workflow across Research, Finance, and Report agents. Renders distributed DAG in Lineage view.",
      icon: GitMerge,
      color: "border-cyan-600 bg-cyan-950/20 text-cyan-400",
    },
  ];

  const handleInject = async (scenarioId: string) => {
    setTriggering(scenarioId);
    try {
      const res = await fetch("/api/demo/inject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await res.json();
      setLastResult({ scenario: scenarioId, data, timestamp: new Date().toLocaleTimeString() });
    } catch (e) {
      alert("Fault injection failed: " + e);
    } finally {
      setTriggering(null);
    }
  };

  const handleReset = async () => {
    if (confirm("Reset AgentTower state to clean baseline? This drops DB tables and re-initializes clean agents.")) {
      setResetting(true);
      try {
        await fetch("/api/demo/reset", { method: "POST" });
        setLastResult({ scenario: "RESET", data: { message: "State cleanly reset to baseline" }, timestamp: new Date().toLocaleTimeString() });
      } catch (e) {
        alert("Reset failed: " + e);
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <PlayCircle className="w-8 h-8 text-blue-400" />
            <span>Live Fault Injection & Demo Controls</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Engineered scenario triggers for the 2-minute live TECHgium presentation demo
          </p>
        </div>

        {/* 10s Fast Reset Button */}
        <button
          onClick={handleReset}
          disabled={resetting}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
          <span>{resetting ? "Resetting State..." : "Reset Baseline State (<10s)"}</span>
        </button>
      </div>

      {/* Grid of Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isBusy = triggering === sc.id;
          return (
            <div
              key={sc.id}
              className={`p-6 rounded-xl border bg-surface shadow-xl flex flex-col justify-between space-y-4 transition-all ${
                sc.highlight ? "border-red-500/80 bg-red-950/10 ring-1 ring-red-500/30" : "border-surface-border"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className={`p-2 rounded-lg border ${sc.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-base text-white">{sc.title}</span>
                  </div>
                  {sc.highlight && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      Flagship Scenario
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{sc.description}</p>
              </div>

              <div className="pt-2 border-t border-surface-border flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">ID: {sc.id}</span>
                <button
                  onClick={() => handleInject(sc.id)}
                  disabled={isBusy}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20 disabled:opacity-50"
                >
                  <PlayCircle className={`w-4 h-4 ${isBusy ? "animate-spin" : ""}`} />
                  <span>{isBusy ? "Injecting..." : "Inject Fault"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Feedback Console */}
      {lastResult && (
        <div className="bg-[#090f1d] rounded-xl border border-surface-border p-5 shadow-2xl space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs border-b border-surface-border pb-2">
            <span className="text-slate-400">
              Last Execution Response: <strong className="text-emerald-400">{lastResult.scenario}</strong>
            </span>
            <span className="text-slate-500">Time: {lastResult.timestamp}</span>
          </div>
          <pre className="text-emerald-400 text-xs overflow-x-auto max-h-60">
            {JSON.stringify(lastResult.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
