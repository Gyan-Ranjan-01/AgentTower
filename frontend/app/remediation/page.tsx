"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Wrench,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  FileCheck,
  ArrowRight,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

function RemediationContent() {
  const searchParams = useSearchParams();
  const initialPlanId = searchParams.get("plan_id");

  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [approving, setApproving] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [approverName, setApproverName] = useState<string>("Alice Chen (VP Finance)");

  useEffect(() => {
    // If plan_id is provided, fetch it; otherwise fetch active incidents to find proposed plans
    if (initialPlanId) {
      fetch(`/api/remediation/plans/${initialPlanId}`)
        .then((r) => r.json())
        .then((d) => setPlan(d))
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    } else {
      // Find latest plan
      fetch("/api/incidents")
        .then((r) => r.json())
        .then(async (incs) => {
          if (Array.isArray(incs)) {
            for (const inc of incs) {
              const res = await fetch(`/api/incidents/${inc.incident_id}`);
              const data = await res.json();
              if (data.remediation_plan_id) {
                const pRes = await fetch(`/api/remediation/plans/${data.remediation_plan_id}`);
                const pData = await pRes.json();
                setPlan(pData);
                break;
              }
            }
          }
        })
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }
  }, [initialPlanId]);

  const handleApprovePlan = async () => {
    if (!plan) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/remediation/plans/${plan.plan_id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: approverName }),
      });
      const data = await res.json();
      setExecutionResult(data);
      // Reload updated plan state
      const pRes = await fetch(`/api/remediation/plans/${plan.plan_id}`);
      setPlan(await pRes.json());
    } catch (e) {
      alert("Remediation execution failed: " + e);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-3">
            <Wrench className="w-8 h-8 text-blue-600" />
            <span>Governed Remediation Pipeline</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Read-only diagnostic planner → Human Approval → Cryptographic HMAC Token → Agent Administration (exclusive writer)
          </p>
        </div>

        {plan && (
          <div className="flex items-center space-x-2 clay-card px-3 py-1.5 rounded-2xl text-xs font-mono">
            <span className="text-slate-500 font-semibold">Plan Status:</span>
            <StatusBadge status={plan.status} size="sm" />
          </div>
        )}
      </div>

      {/* Governed Architecture Flow Diagram Strip */}
      <div className="clay-card p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700 font-semibold">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center border border-blue-200 clay-inset">1</div>
          <span className="font-bold text-slate-800">Remediation Manager</span>
          <span className="text-slate-400 font-medium">(Read-Only Plan)</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block" />
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center justify-center border border-amber-200 clay-inset">2</div>
          <span className="font-bold text-slate-800">Human Approval</span>
          <span className="text-slate-400 font-medium">(Operator Authorization)</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block" />
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200 clay-inset">3</div>
          <span className="font-bold text-slate-800">Permission Broker</span>
          <span className="text-slate-400 font-medium">(HMAC Token + Plan Hash)</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block" />
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center border border-emerald-200 clay-inset">4</div>
          <span className="font-bold text-slate-800">Agent Administration</span>
          <span className="text-slate-400 font-medium">(Sole Writer + Validation)</span>
        </div>
      </div>

      {plan ? (
        <div className="space-y-6">
          {/* Main Plan Card */}
          <div className="clay-card p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/70 pb-4">
              <div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
                  Plan ID: {plan.plan_id}
                </span>
                <h2 className="text-xl font-black text-slate-800 mt-2">{plan.summary}</h2>
              </div>
              <div className="text-xs font-mono text-slate-500 space-y-1 md:text-right">
                <div>Target Agent: <strong className="text-blue-600 font-bold">{plan.agent_id}</strong></div>
                <div className="text-[11px] text-slate-400">Plan Hash: {plan.plan_hash?.substring(0, 16)}...</div>
              </div>
            </div>

            {/* Diagnostic Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Probable Root Cause
                  </h3>
                  <p className="text-sm text-slate-700 clay-inset p-3.5 rounded-2xl bg-slate-50/80 font-medium leading-relaxed">
                    {plan.probable_root_cause}
                  </p>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Step-by-Step Procedure
                  </h3>
                  <ul className="text-xs text-slate-700 clay-inset p-3.5 rounded-2xl bg-slate-50/80 space-y-1.5 list-disc list-inside font-mono">
                    {plan.step_by_step_procedure?.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Proposed Configuration Mutation
                  </h3>
                  <pre className="text-xs font-mono text-slate-800 clay-inset p-3.5 rounded-2xl bg-slate-50 overflow-x-auto">
                    {JSON.stringify(plan.config_changes || {}, null, 2)}
                  </pre>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="clay-inset p-3.5 rounded-2xl bg-slate-50">
                    <span className="text-slate-500 font-bold block">Expected Downtime</span>
                    <span className="text-slate-800 font-bold mt-1 block">{plan.expected_downtime}</span>
                  </div>
                  <div className="clay-inset p-3.5 rounded-2xl bg-slate-50">
                    <span className="text-slate-500 font-bold block">Required Scopes</span>
                    <span className="text-indigo-600 font-bold font-mono mt-1 block">
                      {plan.required_permissions?.join(", ") || "config:write"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Automated Validation Test Specifications */}
            <div className="clay-inset p-4 rounded-2xl bg-slate-50/90">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-2 mb-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Automated Post-Remediation Verification Tests</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium mb-3">
                Agent Administration automatically runs these tests immediately after applying configuration. If any test fails, an automated rollback triggers instantly.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {plan.validation_tests?.map((vt: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <span className="text-slate-700 font-semibold">Test: {vt.type || "retrieval_check"} ({vt.department || "finance"})</span>
                    <span className="text-emerald-600 font-bold">Expected: {String(vt.expected_allowed ?? vt.expected)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Post-execution result display */}
            {executionResult && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Execution & Validation Complete: {executionResult.status}</span>
                </div>
                <div className="text-slate-700 font-medium">
                  Validation Results:
                  <pre className="font-mono text-emerald-800 mt-1 bg-white p-2.5 rounded-xl border border-emerald-100">
                    {JSON.stringify(executionResult.test_results || [], null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Approval & Execution Actions */}
            {plan.status !== "Executed" && (
              <div className="pt-4 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  <span>Approving triggers HMAC token creation & atomic Agent Administration commit.</span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleApprovePlan}
                    disabled={approving}
                    className="clay-btn-success inline-flex items-center space-x-2 px-6 py-2.5 rounded-2xl text-white font-bold text-sm transition-transform shadow-md disabled:opacity-50"
                  >
                    <ShieldCheck className={`w-4 h-4 ${approving ? "animate-spin" : ""}`} />
                    <span>{approving ? "Issuing Token & Executing..." : "Approve & Execute Remediation"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="clay-card p-12 text-center text-slate-500 text-sm space-y-3 font-medium">
          <Wrench className="w-10 h-10 text-slate-400 mx-auto opacity-80" />
          <div className="font-bold text-slate-800">No active remediation plans proposed yet.</div>
          <p className="max-w-md mx-auto text-xs text-slate-500">
            Remediation plans are generated from AEGIS incident reports or live fault injection (e.g. Finance agent reading HR documents).
          </p>
        </div>
      )}
    </div>
  );
}

export default function RemediationPage() {
  return (
    <React.Suspense fallback={<div className="text-slate-400 py-12 text-center text-sm font-medium">Loading remediation manager...</div>}>
      <RemediationContent />
    </React.Suspense>
  );
}
