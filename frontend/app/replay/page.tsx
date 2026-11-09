"use client";

import React, { useEffect, useState } from "react";
import {
  History,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function ReplayPage() {
  const [runs, setRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string>("");
  const [replayEvents, setReplayEvents] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Fetch runs and audit logs
  useEffect(() => {
    fetch("/api/events?limit=150")
      .then((r) => r.json())
      .then((evs) => {
        if (Array.isArray(evs)) {
          const uniqueRuns = Array.from(new Set(evs.map((e: any) => e.run_id).filter(Boolean))) as string[];
          setRuns(uniqueRuns);
          if (uniqueRuns.length > 0) setSelectedRun(uniqueRuns[0]);
        }
      })
      .catch((e) => console.error(e));

    fetch("/api/audit?limit=25")
      .then((r) => r.json())
      .then((logs) => setAuditLogs(Array.isArray(logs) ? logs : []))
      .catch((e) => console.error(e));
  }, []);

  // Fetch replay sequence when run changes
  useEffect(() => {
    if (!selectedRun) return;
    fetch(`/api/replay/${selectedRun}`)
      .then((r) => r.json())
      .then((d) => {
        setReplayEvents(d.events || []);
        setCurrentIndex(0);
        setIsPlaying(false);
      })
      .catch((e) => console.error(e));
  }, [selectedRun]);

  // Playback timer loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev < replayEvents.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 900);
    }
    return () => clearInterval(interval);
  }, [isPlaying, replayEvents.length]);

  const activeEvent = replayEvents[currentIndex];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <History className="w-8 h-8 text-blue-400" />
            <span>Deterministic Audit & Replay</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Step-by-step trace reconstruction with cryptographic non-repudiation audit trails
          </p>
        </div>

        {/* Run Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-400 uppercase">Select Run ID:</label>
          <select
            value={selectedRun}
            onChange={(e) => setSelectedRun(e.target.value)}
            className="bg-surface border border-surface-border text-slate-200 text-sm font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            {runs.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mandatory Disclaimer Banner (per Section 3.9 & 5) */}
      <div className="bg-amber-950/40 border border-amber-800/60 p-4 rounded-xl flex items-center space-x-3 text-amber-200 text-sm">
        <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
        <span className="font-semibold">
          Notice: Audit replay reconstructs recorded execution events from immutable database spans; it does not re-run the LLM.
        </span>
      </div>

      {/* Replay Player Canvas */}
      <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
          <div>
            <span className="text-xs font-mono text-slate-400 uppercase">Reconstructing Run:</span>
            <div className="text-lg font-bold text-white font-mono">{selectedRun}</div>
          </div>

          {/* VCR Style Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentIndex(0)}
              className="p-2 rounded-lg bg-surface-card hover:bg-slate-800 border border-surface-border text-slate-300"
              title="Rewind to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center space-x-1.5 shadow-lg shadow-blue-600/30"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pause Replay" : "Play Replay"}</span>
            </button>
            <button
              onClick={() => setCurrentIndex((p) => Math.min(replayEvents.length - 1, p + 1))}
              disabled={currentIndex >= replayEvents.length - 1}
              className="p-2 rounded-lg bg-surface-card hover:bg-slate-800 border border-surface-border text-slate-300 disabled:opacity-50"
              title="Step forward 1 event"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Step {currentIndex + 1} of {replayEvents.length}</span>
            <span>Progress: {replayEvents.length > 0 ? Math.round(((currentIndex + 1) / replayEvents.length) * 100) : 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(0, replayEvents.length - 1)}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        {/* Active Replay Step Visualizer */}
        {activeEvent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-[#090f1d] border border-surface-border">
            <div className="space-y-3 font-mono text-xs">
              <div className="text-slate-400 uppercase text-[11px] font-semibold">Active Event Telemetry</div>
              <div>
                <span className="text-slate-500">Event ID:</span>{" "}
                <span className="text-blue-400 font-bold">{activeEvent.event_id}</span>
              </div>
              <div>
                <span className="text-slate-500">Agent:</span>{" "}
                <span className="text-white font-bold">{activeEvent.agent_id}</span>
              </div>
              <div>
                <span className="text-slate-500">Event Type:</span>{" "}
                <span className="text-emerald-400 font-bold">{activeEvent.event_type}</span>
              </div>
              {activeEvent.tool_name && (
                <div>
                  <span className="text-slate-500">Tool Invoked:</span>{" "}
                  <span className="text-amber-400 font-bold">{activeEvent.tool_name}</span>
                </div>
              )}
              <div>
                <span className="text-slate-500">Status:</span>{" "}
                <StatusBadge status={activeEvent.status} size="sm" />
              </div>
              <div>
                <span className="text-slate-500">Duration:</span>{" "}
                <span className="text-slate-200">{activeEvent.duration_ms} ms</span>
              </div>
              <div>
                <span className="text-slate-500">Tokens:</span>{" "}
                <span className="text-indigo-400">{activeEvent.input_tokens + activeEvent.output_tokens}</span>
              </div>
            </div>

            <div>
              <div className="text-slate-400 uppercase text-[11px] font-semibold font-mono mb-2">
                Recorded Metadata Attributes
              </div>
              <pre className="p-3 rounded-lg bg-[#050912] border border-surface-border text-emerald-400 text-xs font-mono overflow-x-auto max-h-56">
                {JSON.stringify(activeEvent.attributes || {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-sm">No events found for this run.</div>
        )}
      </div>

      {/* Append-Only Governance Audit Log Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Append-Only Governance Audit Trail</span>
        </h2>

        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#0b1324] uppercase text-slate-400 border-b border-surface-border">
              <tr>
                <th className="px-5 py-3">Audit ID</th>
                <th className="px-5 py-3">Action Type</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Target Agent</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Plan / Token Hash</th>
                <th className="px-5 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {auditLogs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-slate-800/40">
                  <td className="px-5 py-3 text-slate-500">#{log.audit_id}</td>
                  <td className="px-5 py-3 font-semibold text-white">{log.action_type}</td>
                  <td className="px-5 py-3 text-blue-400">{log.actor}</td>
                  <td className="px-5 py-3 text-slate-300">{log.target_agent_id}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={log.status} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-slate-400 truncate max-w-xs">
                    {log.plan_hash ? `${log.plan_hash.substring(0, 14)}...` : "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
