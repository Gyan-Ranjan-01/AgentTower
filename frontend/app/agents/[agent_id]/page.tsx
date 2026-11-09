"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Users,
  ShieldAlert,
  ArrowLeft,
  Clock,
  Cpu,
  Layers,
  CheckCircle,
  FileText,
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
    return <div className="text-slate-400 py-12 text-center text-sm">Loading agent profile...</div>;
  }

  if (!agent || agent.detail) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-xl font-bold text-white">Agent '{agentId}' not found</div>
        <Link href="/" className="text-blue-400 text-sm hover:underline">
          Return to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Fleet Overview</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{agent.name}</h1>
            <StatusBadge status={agent.status} />
          </div>
          <div className="text-xs font-mono text-slate-400">
            ID: <span className="text-blue-400 font-bold">{agent.agent_id}</span>
          </div>
        </div>
      </div>

      {/* Aggregate Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface p-5 rounded-xl border border-surface-border shadow-lg">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Completed Runs</span>
          <div className="text-3xl font-extrabold text-white mt-1">
            {agent.stats?.total_runs || 0}
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Token Volume</span>
          <div className="text-3xl font-extrabold text-indigo-400 mt-1">
            {(agent.stats?.total_tokens || 0).toLocaleString()}
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Avg Run Latency</span>
          <div className="text-3xl font-extrabold text-white mt-1">
            {agent.stats?.avg_duration_ms || 0} ms
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Active Incidents</span>
          <div className="text-3xl font-extrabold text-rose-400 mt-1">
            {agent.stats?.active_incidents || 0}
          </div>
        </div>
      </div>

      {/* Configuration & Scopes Specification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white border-b border-surface-border pb-3">
            Governance Profile & Registry Metadata
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-surface-border">
              <span className="text-slate-400">Underlying Framework:</span>
              <span className="font-mono text-slate-200 capitalize font-semibold">{agent.framework}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border">
              <span className="text-slate-400">Designated Department:</span>
              <span className="text-slate-200 capitalize">{agent.department} ({agent.team})</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border">
              <span className="text-slate-400">Registered Owner:</span>
              <span className="text-slate-200">{agent.owner}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border">
              <span className="text-slate-400">Per-Run Token Budget:</span>
              <span className="font-mono text-amber-400">{agent.token_budget_per_run} tokens</span>
            </div>
            <div className="flex justify-between py-1 border-b border-surface-border">
              <span className="text-slate-400">Heartbeat Check Interval:</span>
              <span className="font-mono text-slate-200">{agent.heartbeat_interval_s} seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Last Telemetry Timestamp:</span>
              <span className="font-mono text-emerald-400">
                {agent.last_heartbeat ? new Date(agent.last_heartbeat).toLocaleTimeString() : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Allowed Scopes & Tools */}
        <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg space-y-4">
          <h2 className="text-base font-bold text-white border-b border-surface-border pb-3">
            Boundary Allow-Lists
          </h2>
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400 block mb-2">
              Authorized Tool Invocations ({agent.allowed_tools?.length || 0})
            </span>
            <div className="flex flex-wrap gap-2">
              {agent.allowed_tools?.map((tool: string) => (
                <span
                  key={tool}
                  className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <span className="text-xs font-semibold uppercase text-slate-400 block mb-2">
              Allowed Document Department Scopes
            </span>
            <div className="flex flex-wrap gap-2">
              {agent.allowed_departments?.map((dept: string) => (
                <span
                  key={dept}
                  className="px-2.5 py-1 rounded bg-blue-950 text-blue-300 text-xs font-mono border border-blue-800 uppercase"
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
        <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg space-y-4">
          <h3 className="text-base font-bold text-white border-b border-surface-border pb-3 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <span>Associated AEGIS Incidents ({incidents.length})</span>
          </h3>
          {incidents.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">
              Zero violations recorded for this agent.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.incident_id}
                  className="p-3 bg-surface-card rounded-lg border border-surface-border text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <SeverityBadge severity={inc.severity} confidence={inc.confidence} />
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                  <div className="font-bold text-white">{inc.title}</div>
                  <p className="text-slate-400 text-[11px]">{inc.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg space-y-4">
          <h3 className="text-base font-bold text-white border-b border-surface-border pb-3 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span>Recent Canonical Spans</span>
          </h3>
          <div className="space-y-2 font-mono text-xs">
            {recentEvents.map((ev, i) => (
              <div
                key={ev.event_id || i}
                className="p-2.5 rounded bg-surface-card border border-surface-border flex items-center justify-between text-[11px]"
              >
                <div>
                  <span className="text-blue-400 font-semibold">{ev.event_type}</span>
                  {ev.tool_name && <span className="text-amber-400 ml-1.5">({ev.tool_name})</span>}
                </div>
                <div className="text-slate-400">
                  <span>{ev.duration_ms}ms</span>
                  <span className="ml-2 text-slate-500">
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
