"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, UserCheck } from "lucide-react";
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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
            <span>Decision Gate & Approvals Queue</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Real-time human-in-the-loop escalation holding sensitive or destructive agent operations
          </p>
        </div>

        {/* Human Operator Role Selector */}
        <div className="flex items-center space-x-2.5 clay-card px-3 py-2 rounded-2xl">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approver:</label>
          <select
            value={selectedApprover}
            onChange={(e) => setSelectedApprover(e.target.value)}
            className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
          >
            {approvers.map((app) => (
              <option key={app} value={app} className="bg-white text-slate-800">
                {app}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pending Actions Queue */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
          <span>Pending Tool Authorization Requests</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
            {pendingRequests.length} Active
          </span>
        </h2>

        {pendingRequests.length === 0 ? (
          <div className="clay-card p-8 text-center text-slate-500 text-sm font-medium">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-90" />
            No pending escalation requests. All autonomous agent actions are within nominal bounds.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.request_id}
                className="clay-card border-2 border-amber-300 p-6 space-y-4 relative overflow-hidden"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-lg font-black text-slate-800 font-mono">
                      Tool: <span className="text-amber-700 font-bold">{req.tool_name}</span>
                    </span>
                    <StatusBadge status={req.status} size="sm" />
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    Agent: <strong className="text-blue-600 font-bold">{req.agent_id}</strong> | Trace: {req.trace_id}
                  </div>
                </div>

                {/* Parameters & Cost Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="clay-inset p-3.5 rounded-2xl bg-slate-50 col-span-2">
                    <span className="text-slate-500 font-bold block mb-1">Execution Parameters:</span>
                    <pre className="font-mono text-slate-800 overflow-x-auto text-[11px]">
                      {JSON.stringify(req.parameters || {}, null, 2)}
                    </pre>
                  </div>
                  <div className="clay-inset p-3.5 rounded-2xl bg-slate-50 space-y-2">
                    <div>
                      <span className="text-slate-500 font-bold block">Accumulated Cost:</span>
                      <span className="text-base font-black text-slate-800 font-mono">
                        ${Number(req.cost_so_far_usd || 0).toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Timeout Action:</span>
                      <span className="text-rose-600 font-bold">Reject on Expiry</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200/70">
                  <input
                    type="text"
                    placeholder="Optional authorization justification / notes..."
                    value={reasonInput}
                    onChange={(e) => setReasonInput(e.target.value)}
                    className="clay-inset w-full sm:w-1/2 px-3.5 py-2 text-xs text-slate-800 rounded-xl bg-slate-50 focus:outline-none font-medium"
                  />
                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleDecision(req.request_id, "reject")}
                      disabled={submitting === req.request_id}
                      className="clay-btn-danger inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-white font-bold text-xs transition-transform"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject & Abort</span>
                    </button>
                    <button
                      onClick={() => handleDecision(req.request_id, "approve")}
                      disabled={submitting === req.request_id}
                      className="clay-btn-success inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl text-white font-bold text-xs transition-transform shadow-md"
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
        <h2 className="text-lg font-bold text-slate-800">Historical Decision Log</h2>
        <div className="clay-card overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100/70 uppercase font-bold text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">Request ID</th>
                <th className="px-5 py-3.5">Tool</th>
                <th className="px-5 py-3.5">Agent</th>
                <th className="px-5 py-3.5">Outcome</th>
                <th className="px-5 py-3.5">Approver</th>
                <th className="px-5 py-3.5">Reason / Details</th>
                <th className="px-5 py-3.5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {pastRequests.map((req) => (
                <tr key={req.request_id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3 text-blue-600 font-semibold">{req.request_id}</td>
                  <td className="px-5 py-3 font-bold text-slate-800 font-sans">{req.tool_name}</td>
                  <td className="px-5 py-3 text-slate-600 font-semibold">{req.agent_id}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={req.status} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-slate-700 font-sans font-medium">{req.decided_by || "System Policy"}</td>
                  <td className="px-5 py-3 text-slate-500 font-sans truncate max-w-xs">
                    {req.decision_reason || "None specified"}
                  </td>
                  <td className="px-5 py-3 text-slate-400">
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
