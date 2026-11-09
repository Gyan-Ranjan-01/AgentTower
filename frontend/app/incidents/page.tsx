"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ShieldAlert,
  AlertOctagon,
  Clock,
  ExternalLink,
  Wrench,
  CheckCircle,
  Search,
  Filter,
} from "lucide-react";
import { SeverityBadge } from "@/components/SeverityBadge";
import { StatusBadge } from "@/components/StatusBadge";

function IncidentsContent() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [incidents, setIncidents] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [proposing, setProposing] = useState<boolean>(false);

  const fetchIncidents = async () => {
    try {
      const res = await fetch("/api/incidents");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setIncidents(list);

      if (initialId) {
        const found = list.find((i) => i.incident_id === initialId);
        if (found) {
          loadIncidentDetail(found.incident_id);
          return;
        }
      }
      if (list.length > 0 && !selectedIncident) {
        loadIncidentDetail(list[0].incident_id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadIncidentDetail = async (incidentId: string) => {
    try {
      const res = await fetch(`/api/incidents/${incidentId}`);
      const data = await res.json();
      setSelectedIncident(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [initialId]);

  const handleProposeRemediation = async () => {
    if (!selectedIncident) return;
    setProposing(true);
    try {
      const res = await fetch("/api/remediation/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: selectedIncident.incident_id }),
      });
      const data = await res.json();
      window.location.href = `/remediation?plan_id=${data.plan_id}`;
    } catch (e) {
      alert("Failed to propose remediation plan: " + e);
    } finally {
      setProposing(false);
    }
  };

  const filtered = incidents.filter((inc) => {
    if (filterSeverity === "ALL") return true;
    return inc.severity.toUpperCase() === filterSeverity;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
            <span>AEGIS Incident Management</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous policy violations, cross-department boundary breaches & resource anomalies
          </p>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center space-x-2 bg-surface p-1 rounded-lg border border-surface-border">
          {["ALL", "CRITICAL", "MEDIUM", "LOW"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                filterSeverity === sev
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Two-Pane Master Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
        {/* Left Pane: Incident List (5 cols) */}
        <div className="lg:col-span-5 bg-surface rounded-xl border border-surface-border p-4 shadow-lg overflow-y-auto max-h-[700px] space-y-3">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 pb-2 border-b border-surface-border flex items-center justify-between">
            <span>Incident Log ({filtered.length})</span>
            <span className="text-[11px] font-mono">Real events only</span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No incidents matching filter.
            </div>
          ) : (
            filtered.map((inc) => {
              const isSelected = selectedIncident?.incident_id === inc.incident_id;
              return (
                <div
                  key={inc.incident_id}
                  onClick={() => loadIncidentDetail(inc.incident_id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-slate-800/80 border-blue-500 shadow-md"
                      : "bg-surface-card border-surface-border hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <SeverityBadge severity={inc.severity} confidence={inc.confidence} />
                    <span className="text-xs font-mono text-slate-400">{inc.agent_id}</span>
                  </div>
                  <div className="text-sm font-bold text-white mb-1">{inc.title}</div>
                  <p className="text-xs text-slate-400 line-clamp-2">{inc.description}</p>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>{inc.incident_id}</span>
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Pane: Incident Detail & Remediation Workflow (7 cols) */}
        <div className="lg:col-span-7 bg-surface rounded-xl border border-surface-border p-6 shadow-lg overflow-y-auto max-h-[700px]">
          {selectedIncident ? (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="border-b border-surface-border pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <SeverityBadge
                      severity={selectedIncident.severity}
                      confidence={selectedIncident.confidence}
                    />
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Rule: <span className="text-slate-200 font-semibold">{selectedIncident.rule_id}</span>
                  </span>
                </div>

                <h2 className="text-xl font-extrabold text-white mt-3">
                  {selectedIncident.title}
                </h2>
                <div className="flex items-center space-x-4 text-xs text-slate-400 mt-2 font-mono">
                  <span>ID: {selectedIncident.incident_id}</span>
                  <span>Agent: <strong className="text-blue-400">{selectedIncident.agent_id}</strong></span>
                  <span>Time: {new Date(selectedIncident.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Description & Impact */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Violation Description
                  </h3>
                  <p className="text-sm text-slate-200 bg-surface-card p-3 rounded-lg border border-surface-border leading-relaxed">
                    {selectedIncident.description}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Potential Impact Analysis
                  </h3>
                  <p className="text-sm text-rose-300/90 bg-rose-950/20 p-3 rounded-lg border border-rose-900/30 leading-relaxed">
                    {selectedIncident.potential_impact}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Recommended Operator Action
                  </h3>
                  <p className="text-sm text-emerald-300/90 bg-emerald-950/20 p-3 rounded-lg border border-emerald-900/30 leading-relaxed">
                    {selectedIncident.recommended_action}
                  </p>
                </div>
              </div>

              {/* Linked Evidence Events */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Linked Forensic Evidence Events ({selectedIncident.evidence_event_ids?.length || 0})
                </h3>
                {selectedIncident.evidence_events?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedIncident.evidence_events.map((ev: any) => (
                      <div
                        key={ev.event_id}
                        className="bg-[#0b1220] p-3 rounded-lg border border-surface-border text-xs font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between text-slate-300 font-semibold">
                          <span className="text-blue-400">{ev.event_id}</span>
                          <span className="text-slate-400">{ev.event_type} {ev.tool_name ? `(${ev.tool_name})` : ""}</span>
                          <span className={ev.status === "error" ? "text-rose-400" : "text-emerald-400"}>{ev.status}</span>
                        </div>
                        <pre className="text-slate-400 text-[11px] overflow-x-auto pt-1">
                          {JSON.stringify(ev.attributes || {}, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-mono">
                    Event IDs: {selectedIncident.evidence_event_ids?.join(", ") || "None"}
                  </div>
                )}
              </div>

              {/* Remediation Action Controls */}
              <div className="pt-4 border-t border-surface-border flex items-center justify-between">
                {selectedIncident.trace_id ? (
                  <Link
                    href={`/lineage`}
                    className="inline-flex items-center space-x-1.5 text-xs text-blue-400 hover:text-white font-medium"
                  >
                    <span>View in Lineage DAG</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                ) : <span />}

                {selectedIncident.status === "Resolved" ? (
                  <div className="inline-flex items-center space-x-2 text-sm text-emerald-400 font-semibold bg-emerald-950/60 px-4 py-2 rounded-lg border border-emerald-800">
                    <CheckCircle className="w-4 h-4" />
                    <span>Incident Resolved & Validated</span>
                  </div>
                ) : (
                  <button
                    onClick={handleProposeRemediation}
                    disabled={proposing}
                    className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                  >
                    <Wrench className={`w-4 h-4 ${proposing ? "animate-spin" : ""}`} />
                    <span>{proposing ? "Generating Plan..." : "Propose Governed Remediation"}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
              Select an incident from the list to view forensic evidence and remediation plans.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <React.Suspense fallback={<div className="text-slate-400 py-12 text-center text-sm">Loading incident operations...</div>}>
      <IncidentsContent />
    </React.Suspense>
  );
}
