"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, DollarSign, UserCheck, AlertTriangle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string>("Alice Chen (VP Finance)");
  const [reasonInput, setReasonInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const approvers = [
    "Alice Chen (VP Finance)",
    "Bob Kumar (DevOps Lead)",
    "Carol Diaz (People Ops)",
    "Devin Vance (Chief of Staff)",
  ];

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/gate/requests");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();

    // Listen to real-time gate requests via SSE
    const es = new EventSource("/api/sse");
    es.addEventListener("gate_request_created", () => fetchRequests());
    es.addEventListener("gate_request_decided", () => fetchRequests());
    return () => es.close();
  }, []);

  const handleDecision = async (requestId: string, decision: "approve" | "reject") => {
    setSubmitting(requestId);
    try {
      await fetch(`/api/gate/requests/${requestId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          decided_by: selectedApprover,
          reason: reasonInput || (decision === "approve" ? "Authorized by human operator" : "Denied by policy"),
        }),
      });
      setReasonInput("");
      fetchRequests();
    } catch (e) {
      alert("Failed to record gate decision: " + e);
    } finally {
      setSubmitting(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "Pending");
  const pastRequests = requests.filter((r) => r.status !== "Pending");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <span>Decision Gate & Approvals Queue</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time human-in-the-loop escalation holding sensitive or destructive agent operations
          </p>
        </div>

        {/* Human Operator Role Selector */}
        <div className="flex items-center space-x-3 bg-surface p-2.5 rounded-xl border border-surface-border">
          <UserCheck className="w-4 h-4 text-blue-400" />
          <label className="text-xs font-semibold text-slate-400 uppercase">Approver Identity:</label>
          <select
            value={selectedApprover}
            onChange={(e) => setSelectedApprover(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-md px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
          >
            {approvers.map((app) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pending Actions Queue */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <span>Pending Tool Authorization Requests</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {pendingRequests.length} Active
          </span>
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="bg-surface rounded-xl border border-surface-border p-8 text-center text-slate-400 text-sm">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
            No pending escalation requests. All autonomous agent actions are within nominal bounds.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.request_id}
                className="bg-surface rounded-xl border-2 border-amber-500/50 p-6 shadow-xl relative overflow-hidden space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-surface-border pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-lg font-bold text-white font-mono">
                      Tool: <span className="text-amber-400">{req.tool_name}</span>
                    </span>
                    <StatusBadge status={req.status} size="sm" />
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Agent: <strong className="text-blue-400">{req.agent_id}</strong> | Trace: {req.trace_id}
                  </div>
                </div>

                {/* Parameters & Cost Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-surface-card rounded-lg border border-surface-border col-span-2">
                    <span className="text-slate-400 font-semibold block mb-1">Execution Parameters:</span>
                    <pre className="font-mono text-emerald-400 overflow-x-auto text-[11px]">
                      {JSON.stringify(req.parameters || {}, null, 2)}
                    </pre>
                  </div>
                  <div className="p-3 bg-surface-card rounded-lg border border-surface-border space-y-2">
                    <div>
                      <span className="text-slate-400 block">Accumulated Cost:</span>
                      <span className="text-base font-bold text-white font-mono">
                        ${Number(req.cost_so_far_usd || 0).toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Timeout Action:</span>
                      <span className="text-rose-400 font-semibold">Reject on Expiry</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-surface-border">
                  <input
                    type="text"
                    placeholder="Optional authorization justification / notes..."
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    className="w-full sm:w-1/2 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleDecision(req.request_id, "reject")}
                      disabled={submitting === req.request_id}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 font-semibold text-xs transition-colors"
                    >
                      <XCircle className="w-4 h-4 text-rose-400" />
                      <span>Reject & Abort</span>
                    </button>
                    <button
                      onClick={() => handleDecision(req.request_id, "approve")}
                      disabled={submitting === req.request_id}
                      className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/30"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Authorize Execution</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historical Decided Queue */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-white">Historical Decision Log</h2>
        <div className="bg-surface rounded-xl border border-surface-border overflow-hidden shadow-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b1324] uppercase font-semibold text-slate-400 border-b border-surface-border">
              <tr>
                <th className="px-5 py-3">Request ID</th>
                <th className="px-5 py-3">Tool</th>
                <th className="px-5 py-3">Agent</th>
                <th className="px-5 py-3">Outcome</th>
                <th className="px-5 py-3">Approver</th>
                <th className="px-5 py-3">Reason / Details</th>
                <th className="px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {pastRequests.map((req) => (
                <tr key={req.request_id} className="hover:bg-slate-800/40 font-mono">
                  <td className="px-5 py-3 text-blue-400">{req.request_id}</td>
                  <td className="px-5 py-3 font-semibold text-white">{req.tool_name}</td>
                  <td className="px-5 py-3 text-slate-300">{req.agent_id}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={req.status} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-slate-300">{req.decided_by || "System Policy"}</td>
                  <td className="px-5 py-3 text-slate-400 truncate max-w-xs">
                    {req.decision_reason || "None specified"}
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {req.decided_at ? new Date(req.decided_at).toLocaleTimeString() : "-"}
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
