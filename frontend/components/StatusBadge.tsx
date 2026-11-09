"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Play, HelpCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const s = status.toLowerCase();
  const isSm = size === "sm";

  if (s === "healthy" || s === "success" || s === "approved" || s === "resolved" || s === "executed") {
    return (
      <span className={`inline-flex items-center space-x-1.5 font-bold rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-[2px_2px_5px_#e2e8f0,-2px_-2px_5px_#ffffff] ${isSm ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"}`}>
        <CheckCircle2 className={isSm ? "w-3 h-3 text-emerald-600" : "w-3.5 h-3.5 text-emerald-600"} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  if (s === "executing" || s === "running" || s === "pending" || s === "proposed" || s === "in remediation") {
    return (
      <span className={`inline-flex items-center space-x-1.5 font-bold rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-[2px_2px_5px_#e2e8f0,-2px_-2px_5px_#ffffff] ${isSm ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"}`}>
        <Play className={`${isSm ? "w-3 h-3" : "w-3.5 h-3.5"} text-indigo-600 animate-pulse`} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  if (s === "unavailable" || s === "down" || s === "error" || s === "rejected" || s === "failed" || s === "critical") {
    return (
      <span className={`inline-flex items-center space-x-1.5 font-bold rounded-xl bg-rose-50 border border-rose-200 text-rose-700 shadow-[2px_2px_5px_#e2e8f0,-2px_-2px_5px_#ffffff] ${isSm ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"}`}>
        <AlertOctagon className={isSm ? "w-3 h-3 text-rose-600" : "w-3.5 h-3.5 text-rose-600"} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  if (s === "degraded" || s === "medium" || s === "warning" || s === "rolledback") {
    return (
      <span className={`inline-flex items-center space-x-1.5 font-bold rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shadow-[2px_2px_5px_#e2e8f0,-2px_-2px_5px_#ffffff] ${isSm ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"}`}>
        <AlertTriangle className={isSm ? "w-3 h-3 text-amber-600" : "w-3.5 h-3.5 text-amber-600"} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center space-x-1.5 font-bold rounded-xl bg-slate-100 border border-slate-200 text-slate-700 shadow-[2px_2px_5px_#e2e8f0,-2px_-2px_5px_#ffffff] ${isSm ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs"}`}>
      <HelpCircle className={isSm ? "w-3 h-3 text-slate-500" : "w-3.5 h-3.5 text-slate-500"} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
