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
  Clock,
  Radio,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";

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

    es.addEventListener("agent_updated", (e: any) => {
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
    <div className="space-y-8">
      {/* Top Header & Fast Refresh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <span>Agent Operations Console</span>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time telemetry, boundary supervision, cost attribution & distributed lineage
          </p>
        </div>

        <button
          onClick={fetchData}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-surface hover:bg-slate-800 border border-surface-border text-slate-300 text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Headline Cards (1080p presentation-ready) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Agents */}
        <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-sm font-semibold uppercase tracking-wider">Registered Agents</span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight">{totalAgents}</div>
          <div className="mt-3 flex items-center space-x-3 text-xs font-medium">
            <span className="text-emerald-400 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
              {healthyAgents} Healthy
            </span>
            <span className="text-blue-400 flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
              {executingAgents} Active
            </span>
            {unavailableAgents > 0 && (
              <span className="text-rose-400 flex items-center font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
                {unavailableAgents} Down
              </span>
            )}
          </div>
        </div>

        {/* KPI 2: Active Incidents */}
        <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-sm font-semibold uppercase tracking-wider">Active Incidents</span>
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <span className={incidents.length > 0 ? "text-rose-400" : "text-emerald-400"}>
              {incidents.length}
            </span>
            <span className="text-xs font-normal text-slate-400 ml-2">AEGIS Supervised</span>
          </div>
          <div className="mt-3 flex items-center space-x-3 text-xs font-medium">
            <span className="text-red-400 font-bold">{criticalIncidents} Critical</span>
            <span className="text-amber-400">{mediumIncidents} Medium</span>
            <span className="text-slate-400">{lowIncidents} Low</span>
          </div>
        </div>

        {/* KPI 3: Token Throughput */}
        <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-sm font-semibold uppercase tracking-wider">Total Tokens</span>
            <Cpu className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-4xl font-extrabold text-white tracking-tight">
            {(cost?.total_tokens || 0).toLocaleString()}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Across LangChain, CrewAI & AutoGen runs
          </div>
        </div>

        {/* KPI 4: Spend Attribution */}
        <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-sm font-semibold uppercase tracking-wider">Attributed Spend</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-4xl font-extrabold text-emerald-400 tracking-tight">
            ${(cost?.total_cost_usd || 0.0).toFixed(4)}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Real event pricing via config/prices.yaml
          </div>
        </div>
      </div>

      {/* Main Grid: Live Agents Fleet & Active Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agents Fleet Table (2 cols wide) */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-surface-border shadow-lg overflow-hidden">
          <div className="p-5 border-b border-surface-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Registered Autonomous Agents</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Heterogeneous frameworks unified under one canonical control plane
              </p>
            </div>
            <Link
              href="/demo"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center space-x-1"
            >
              <span>Trigger Fault Scenarios</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0b1324] text-xs uppercase font-semibold text-slate-400 border-b border-surface-border">
                <tr>
                  <th className="px-5 py-3.5">Agent / Role</th>
                  <th className="px-5 py-3.5">Framework</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Budget</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {agents.map((ag) => (
                  <tr key={ag.agent_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{ag.name}</div>
                      <div className="text-xs font-mono text-slate-400">{ag.agent_id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {ag.framework}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-200 capitalize">{ag.department}</div>
                      <div className="text-xs text-slate-400">{ag.team}</div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={ag.status} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-300">
                      {ag.token_budget_per_run} tok/run
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/agents/${ag.agent_id}`}
                        className="inline-flex items-center space-x-1 text-xs text-blue-400 hover:text-white px-2.5 py-1 rounded bg-blue-900/30 border border-blue-800/40 transition-colors"
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
          <div className="bg-surface rounded-xl border border-surface-border shadow-lg p-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Active AEGIS Alerts</span>
              </h2>
              <Link href="/incidents" className="text-xs text-blue-400 hover:underline">
                View All ({incidents.length})
              </Link>
            </div>

            {incidents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                  ✓
                </div>
                Nominal operations: 0 active policy incidents.
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.slice(0, 4).map((inc) => (
                  <div
                    key={inc.incident_id}
                    className="p-3.5 rounded-lg bg-surface-card border border-surface-border hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <SeverityBadge severity={inc.severity} confidence={inc.confidence} />
                      <span className="text-[11px] font-mono text-slate-400">
                        {inc.agent_id}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-white line-clamp-1">
                      {inc.title}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {inc.description}
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">{inc.incident_id}</span>
                      <Link
                        href={`/incidents?id=${inc.incident_id}`}
                        className="text-blue-400 hover:text-blue-300 font-medium"
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
          <div className="bg-surface rounded-xl border border-surface-border shadow-lg p-5">
            <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Live Event Ingest</span>
              </h3>
              <span className="text-[11px] font-mono text-slate-500">SSE Push</span>
            </div>
            <div className="space-y-2 text-xs">
              {events.slice(0, 5).map((ev, i) => (
                <div
                  key={ev.event_id || i}
                  className="flex items-center justify-between py-1.5 border-b border-slate-800/60 font-mono text-[11px]"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-blue-400 font-semibold">{ev.agent_id}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-300">{ev.event_type}</span>
                    {ev.tool_name && (
                      <span className="text-amber-400">({ev.tool_name})</span>
                    )}
                  </div>
                  <span className="text-slate-500">{ev.duration_ms}ms</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
