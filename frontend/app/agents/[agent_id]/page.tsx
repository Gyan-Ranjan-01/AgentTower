"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  ShieldAlert,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.agent_id as string;

  const [agent, setAgent] = useState<any | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!agentId) return;

    Promise.all([
      fetch(`/api/agents/${agentId}`).then((r) => r.json()),
      fetch(`/api/events?agent_id=${agentId}&limit=12`).then((r) => r.json()),
      fetch(`/api/incidents`).then((r) => r.json()),
    ])
      .then(([agData, evData, incData]) => {
        setAgent(agData);
        setRecentEvents(Array.isArray(evData) ? evData : []);
        if (Array.isArray(incData)) {
          setIncidents(incData.filter((i: any) => i.agent_id === agentId));
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) {
    return <div className="text-slate-400 py-12 text-center text-sm font-medium">Loading agent profile...</div>;
  }

  if (!agent || agent.detail) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-xl font-bold text-slate-800">Agent '{agentId}' not found</div>
        <Link href="/" className="clay-btn text-blue-600 text-sm font-bold px-4 py-2 rounded-xl inline-block">
          Return to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/"
          className="clay-btn inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold px-3 py-1.5 rounded-xl mb-3 transition-transform"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fleet Overview</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{agent.name}</h1>
            <StatusBadge status={agent.status} />
          </div>
          <div className="text-xs font-mono text-slate-500">
            ID: <span className="text-blue-600 font-bold">{agent.agent_id}</span>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Strip */}
      <div className="clay-card p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Completed Runs</span>
          <div className="text-3xl font-black text-slate-800 mt-1">
            {agent.stats?.total_runs || 0}
          </div>
        </div>
        <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Token Volume</span>
          <div className="text-3xl font-black text-indigo-600 mt-1">
            {(agent.stats?.total_tokens || 0).toLocaleString()}
          </div>
        </div>
        <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Run Latency</span>
          <div className="text-3xl font-black text-slate-800 mt-1">
            {agent.stats?.avg_duration_ms || 0} ms
          </div>
        </div>
        <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Incidents</span>
          <div className={`text-3xl font-black mt-1 ${(agent.stats?.active_incidents || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {agent.stats?.active_incidents || 0}
          </div>
        </div>
      </div>

      {/* Configuration & Scopes Specification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="clay-card p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-200/70 pb-3">
            Governance Profile & Registry Metadata
          </h2>
          <div className="space-y-2.5 text-xs font-medium">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Underlying Framework:</span>
              <span className="font-mono text-slate-800 capitalize font-bold">{agent.framework}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Designated Department:</span>
              <span className="text-slate-800 capitalize font-semibold">{agent.department} ({agent.team})</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Registered Owner:</span>
              <span className="text-slate-800">{agent.owner}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Per-Run Token Budget:</span>
              <span className="font-mono text-amber-600 font-bold">{agent.token_budget_per_run} tokens</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500">Heartbeat Check Interval:</span>
              <span className="font-mono text-slate-700">{agent.heartbeat_interval_s} seconds</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-500">Last Telemetry Timestamp:</span>
              <span className="font-mono text-emerald-600 font-bold">
                {agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString() : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Allowed Scopes & Tools */}
        <div className="clay-card p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-200/70 pb-3">
            Boundary Allow-Lists
          </h2>
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              Authorized Tool Invocations ({agent.allowed_tools?.length || 0})
            </span>
            <div className="flex flex-wrap gap-2">
              {agent.allowed_tools?.map((tool: string) => (
                <span
                  key={tool}
                  className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200/80 shadow-xs"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider block mb-2">
              Allowed Document Department Scopes
            </span>
            <div className="flex flex-wrap gap-2">
              {agent.allowed_departments?.map((dept: string) => (
                <span
                  key={dept}
                  className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200 shadow-xs uppercase"
                >
                  {dept}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active Incidents & Forensic Spans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents */}
        <div className="clay-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-200/70 pb-3 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span>Associated AEGIS Incidents ({incidents.length})</span>
          </h3>
          {incidents.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center font-medium">
              Zero violations recorded for this agent.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  className="p-3.5 bg-white rounded-2xl border border-slate-200/70 text-xs space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={inc.severity} confidence={inc.confidence} />
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                  <div className="font-bold text-slate-800">{inc.title}</div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="clay-card p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800 border-b border-slate-200/70 pb-3 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>Recent Canonical Spans</span>
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {recentEvents.map((ev, i) => (
              <div
                key={ev.event_id || i}
                className="clay-inset p-2.5 rounded-xl bg-slate-50 flex items-center justify-between text-[11px]"
              >
                <div>
                  <span className="text-blue-600 font-bold">{ev.event_type}</span>
                  {ev.tool_name && <span className="text-amber-600 font-semibold ml-1.5">({ev.tool_name})</span>}
                </div>
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-700">{ev.duration_ms}ms</span>
                  <span className="ml-2 text-slate-400">
                    {ev.input_tokens + ev.output_tokens > 0 ? `${ev.input_tokens + ev.output_tokens} tok` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
