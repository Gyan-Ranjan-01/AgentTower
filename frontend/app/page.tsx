"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldAlert,
  Cpu,
  DollarSign,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Radio,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { ModelPricingPopover } from "@/components/ModelPricingPopover";
import { AdaptiveIntelligenceControl } from "@/components/AdaptiveIntelligenceControl";

export default function OverviewPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [cost, setCost] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [agRes, incRes, costRes, evRes] = await Promise.all([
        fetch("/api/agents").then((r) => r.json()),
        fetch("/api/incidents?status=Active").then((r) => r.json()),
        fetch("/api/cost").then((r) => r.json()),
        fetch("/api/events?limit=8").then((r) => r.json()),
      ]);
      setAgents(Array.isArray(agRes) ? agRes : []);
      setIncidents(Array.isArray(incRes) ? incRes : []);
      setCost(costRes || null);
      setEvents(Array.isArray(evRes) ? evRes : []);
    } catch (e) {
      console.error("Failed to load overview data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to real-time events via SSE
    const es = new EventSource("/api/sse");
    es.addEventListener("incident_raised", (e: any) => {
      try {
        const newInc = JSON.parse(e.data);
        setIncidents((prev) => [newInc, ...prev.filter((i) => i.incident_id !== newInc.incident_id)]);
      } catch (err) {}
    });

    es.addEventListener("agent_updated", () => {
      fetchData();
    });

    es.addEventListener("event_ingested", (e: any) => {
      try {
        const newEv = JSON.parse(e.data);
        setEvents((prev) => [newEv, ...prev.slice(0, 7)]);
      } catch (err) {}
    });

    es.addEventListener("demo_reset", () => {
      fetchData();
    });

    return () => es.close();
  }, []);

  // Compute KPI metrics
  const totalAgents = agents.length;
  const healthyAgents = agents.filter((a) => a.status === "healthy").length;
  const unavailableAgents = agents.filter((a) => a.status === "unavailable").length;
  const executingAgents = agents.filter((a) => a.status === "executing").length;

  const criticalIncidents = incidents.filter((i) => i.severity === "Critical").length;
  const mediumIncidents = incidents.filter((i) => i.severity === "Medium").length;
  const lowIncidents = incidents.filter((i) => i.severity === "Low").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Fast Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-3">
            <span>Agent Operations Console</span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Real-time telemetry, boundary supervision, cost attribution & distributed lineage
          </p>
        </div>

        <button
          onClick={fetchData}
          className="clay-btn inline-flex items-center space-x-2 px-4 py-2 text-slate-700 text-sm font-semibold transition-transform"
        >
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Headline Cards (Tactile Claymorphic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Agents */}
        <div className="clay-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Agents</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center clay-inset">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tight">{totalAgents}</div>
          <div className="mt-4 flex items-center space-x-2 text-xs font-semibold">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
              {healthyAgents} Healthy
            </span>
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
              {executingAgents} Active
            </span>
            {unavailableAgents > 0 && (
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60 flex items-center font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
                {unavailableAgents} Down
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Active Incidents */}
        <div className="clay-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Active Incidents</span>
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center clay-inset">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tight flex items-center space-x-2">
            <span className={incidents.length > 0 ? "text-rose-600" : "text-emerald-600"}>
              {incidents.length}
            </span>
            <span className="text-xs font-bold text-slate-500 ml-2">AEGIS Supervised</span>
          </div>
          <div className="mt-4 flex items-center space-x-2 text-xs font-semibold">
            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">{criticalIncidents} Critical</span>
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">{mediumIncidents} Medium</span>
            <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">{lowIncidents} Low</span>
          </div>
        </div>

        {/* KPI 3: Token Throughput */}
        <div className="clay-card p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tokens</span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center clay-inset">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="text-4xl font-black text-slate-800 tracking-tight">
            {(cost?.total_tokens || 0).toLocaleString()}
          </div>
          <div className="mt-4 text-xs font-medium text-slate-500">
            Across LangChain, CrewAI & AutoGen runs
          </div>
        </div>

        {/* KPI 4: Spend Attribution */}
        <div className="clay-card p-5 relative z-20">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Attributed Spend</span>
            <ModelPricingPopover />
          </div>
          <div className="text-4xl font-black text-emerald-600 tracking-tight">
            ${(cost?.total_cost_usd || 0.0).toFixed(4)}
          </div>
          <div className="mt-4 text-xs font-medium text-slate-500 flex items-center justify-between">
            <span>Real rates via <span className="font-mono text-[11px] font-semibold text-slate-600">prices.yaml</span></span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Hover $ for rates</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Agents Fleet & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agents Fleet Table (2 cols wide) */}
        <div className="lg:col-span-2 clay-card overflow-hidden">
          <div className="p-5 border-b border-slate-200/70 flex items-center justify-between bg-slate-50/40">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Registered Autonomous Agents</h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Heterogeneous frameworks unified under one canonical control plane
              </p>
            </div>
            <Link
              href="/demo"
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1"
            >
              <span>Trigger Fault Scenarios</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/70 text-xs uppercase font-bold text-slate-500 border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-3.5">Agent / Role</th>
                  <th className="px-5 py-3.5">Framework</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Budget</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {agents.map((ag) => (
                  <tr key={ag.agent_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{ag.name}</div>
                      <div className="text-xs font-mono text-slate-400">{ag.agent_id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200/80 font-semibold shadow-xs">
                        {ag.framework}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-800 capitalize font-semibold">{ag.department}</div>
                      <div className="text-xs text-slate-500">{ag.team}</div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={ag.status} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-600 font-semibold">
                      {ag.token_budget_per_run} tok/run
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/agents/${ag.agent_id}`}
                        className="clay-btn inline-flex items-center space-x-1.5 text-xs text-blue-700 font-bold px-3 py-1.5 rounded-xl transition-transform"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Active AEGIS Incidents & Quick Links */}
        <div className="space-y-6">
          <div className="clay-card p-5">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>Active AEGIS Alerts</span>
              </h2>
              <Link href="/incidents" className="text-xs font-bold text-blue-600 hover:underline">
                View All ({incidents.length})
              </Link>
            </div>

            {incidents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm font-medium">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center mx-auto mb-2 clay-inset font-bold">
                  ✓
                </div>
                Nominal operations: 0 active policy incidents.
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.slice(0, 4).map((inc) => (
                  <div
                    key={inc.incident_id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <SeverityBadge severity={inc.severity} confidence={inc.confidence} />
                      <span className="text-[11px] font-mono font-semibold text-slate-400">
                        {inc.agent_id}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 line-clamp-1">
                      {inc.title}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                      {inc.description}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">{inc.incident_id}</span>
                      <Link
                        href={`/incidents?id=${inc.incident_id}`}
                        className="text-blue-600 hover:text-blue-800 font-bold"
                      >
                        Inspect & Remediate →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Ingestion Stream */}
          <div className="clay-card p-5">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                <span>Live Event Ingest</span>
              </h3>
              <span className="text-[11px] font-mono font-semibold text-slate-400">SSE Push</span>
            </div>
            <div className="clay-inset p-3 rounded-2xl bg-slate-50/80 space-y-2 text-xs">
              {events.slice(0, 5).map((ev, i) => (
                <div
                  key={ev.event_id || i}
                  className="flex items-center justify-between py-1 border-b border-slate-200/60 font-mono text-[11px] last:border-b-0"
                >
                  <div className="flex items-center space-x-2 overflow-hidden text-ellipsis">
                    <span className="text-blue-600 font-bold">{ev.agent_id}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-700 font-semibold">{ev.event_type}</span>
                    {ev.tool_name && (
                      <span className="text-amber-600 font-bold">({ev.tool_name})</span>
                    )}
                  </div>
                  <span className="text-slate-400 font-medium ml-2 shrink-0">{ev.duration_ms}ms</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Adaptive Intelligence & Dynamic Cost Control Section */}
      <div className="pt-4">
        <AdaptiveIntelligenceControl />
      </div>
    </div>
  );
}
