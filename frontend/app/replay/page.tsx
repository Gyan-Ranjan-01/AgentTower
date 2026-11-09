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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-3">
            <History className="w-8 h-8 text-blue-600" />
            <span>Deterministic Audit & Replay</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Step-by-step trace reconstruction with cryptographic non-repudiation audit trails
          </p>
        </div>

        {/* Run Selector */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Run ID:</label>
          <div className="clay-card p-1 rounded-2xl">
            <select
              value={selectedRun}
              onChange={(e) => setSelectedRun(e.target.value)}
              className="bg-transparent text-slate-800 text-sm font-mono font-semibold px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {runs.map((r) => (
                <option key={r} value={r} className="bg-white text-slate-800 font-mono">
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Mandatory Disclaimer Banner */}
      <div className="bg-amber-50/90 border border-amber-200/80 p-4 rounded-2xl flex items-center space-x-3 text-amber-900 text-sm shadow-xs font-medium">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <span>
          <strong>Audit Replay Notice:</strong> Reconstructs recorded execution events from immutable database spans; it does not re-run the LLM.
        </span>
      </div>

      {/* Replay Player Canvas */}
      <div className="clay-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/70 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">Reconstructing Run:</span>
            <div className="text-lg font-black text-slate-800 font-mono">{selectedRun}</div>
          </div>

          {/* VCR Style Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentIndex(0)}
              className="clay-btn p-2 rounded-xl text-slate-600 hover:text-slate-800"
              title="Rewind to start"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="clay-btn-primary px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center space-x-1.5 shadow-md transition-transform"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? "Pause Replay" : "Play Replay"}</span>
            </button>
            <button
              onClick={() => setCurrentIndex((p) => Math.min(replayEvents.length - 1, p + 1))}
              disabled={currentIndex >= replayEvents.length - 1}
              className="clay-btn p-2 rounded-xl text-slate-600 disabled:opacity-40"
              title="Step forward 1 event"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timeline Scrubber */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-mono font-bold">
            <span>Step {currentIndex + 1} of {replayEvents.length}</span>
            <span>Progress: {replayEvents.length > 0 ? Math.round(((currentIndex + 1) / replayEvents.length) * 100) : 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(0, replayEvents.length - 1)}
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="w-full accent-blue-600 bg-slate-200 rounded-lg cursor-pointer h-2"
          />
        </div>

        {/* Active Replay Step Visualizer */}
        {activeEvent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="space-y-3 font-mono text-xs">
              <div className="text-slate-500 uppercase text-[11px] font-bold tracking-wider">Active Event Telemetry</div>
              <div>
                <span className="text-slate-400">Event ID:</span>{" "}
                <span className="text-blue-600 font-bold">{activeEvent.event_id}</span>
              </div>
              <div>
                <span className="text-slate-400">Agent:</span>{" "}
                <span className="text-slate-800 font-bold">{activeEvent.agent_id}</span>
              </div>
              <div>
                <span className="text-slate-400">Event Type:</span>{" "}
                <span className="text-emerald-600 font-bold">{activeEvent.event_type}</span>
              </div>
              {activeEvent.tool_name && (
                <div>
                  <span className="text-slate-400">Tool Invoked:</span>{" "}
                  <span className="text-amber-600 font-bold">{activeEvent.tool_name}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400">Status:</span>{" "}
                <StatusBadge status={activeEvent.status} size="sm" />
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>{" "}
                <span className="text-slate-800 font-semibold">{activeEvent.duration_ms} ms</span>
              </div>
              <div>
                <span className="text-slate-400">Tokens:</span>{" "}
                <span className="text-indigo-600 font-bold">{activeEvent.input_tokens + activeEvent.output_tokens}</span>
              </div>
            </div>

            <div>
              <div className="text-slate-500 uppercase text-[11px] font-bold font-mono mb-2 tracking-wider">
                Recorded Metadata Attributes
              </div>
              <pre className="clay-inset p-3.5 rounded-2xl bg-slate-50 text-slate-800 text-xs font-mono overflow-x-auto max-h-56">
                {JSON.stringify(activeEvent.attributes || {}, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 text-sm font-medium">No events found for this run.</div>
        )}
      </div>

      {/* Append-Only Governance Audit Log Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>Append-Only Governance Audit Trail</span>
        </h2>

        <div className="clay-card overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700 font-mono">
            <thead className="bg-slate-100/70 uppercase text-slate-500 font-bold border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">Audit ID</th>
                <th className="px-5 py-3.5">Action Type</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Target Agent</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Plan / Token Hash</th>
                <th className="px-5 py-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {auditLogs.map((log) => (
                <tr key={log.audit_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 text-slate-400">#{log.audit_id}</td>
                  <td className="px-5 py-3 font-bold text-slate-800 font-sans">{log.action_type}</td>
                  <td className="px-5 py-3 text-blue-600 font-semibold">{log.actor}</td>
                  <td className="px-5 py-3 text-slate-700">{log.target_agent_id}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={log.status} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-slate-500 truncate max-w-xs">
                    {log.plan_hash ? `${log.plan_hash.substring(0, 14)}...` : "-"}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
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
