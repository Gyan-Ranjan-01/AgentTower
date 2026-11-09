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
      <span className={`inline-flex items-center space-x-1.5 font-medium rounded-md bg-emerald-950/60 border border-emerald-800 text-emerald-300 ${isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}>
        <CheckCircle2 className={isSm ? "w-3 h-3" : "w-4 h-4"} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  if (s === "executing" || s === "running" || s === "pending" || s === "proposed" || s === "in remediation") {
    return (
      <span className={`inline-flex items-center space-x-1.5 font-medium rounded-md bg-blue-950/60 border border-blue-800 text-blue-300 ${isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}>
        <Play className={`${isSm ? "w-3 h-3" : "w-4 h-4"} animate-pulse`} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  if (s === "unavailable" || s === "down" || s === "error" || s === "rejected" || s === "failed" || s === "critical") {
    return (
      <span className={`inline-flex items-center space-x-1.5 font-medium rounded-md bg-rose-950/80 border border-rose-800 text-rose-300 ${isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}>
        <AlertOctagon className={isSm ? "w-3 h-3" : "w-4 h-4"} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  if (s === "degraded" || s === "medium" || s === "warning" || s === "rolledback") {
    return (
      <span className={`inline-flex items-center space-x-1.5 font-medium rounded-md bg-amber-950/60 border border-amber-800 text-amber-300 ${isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}>
        <AlertTriangle className={isSm ? "w-3 h-3" : "w-4 h-4"} />
        <span className="capitalize">{status}</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center space-x-1.5 font-medium rounded-md bg-slate-800 border border-slate-700 text-slate-300 ${isSm ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}>
      <HelpCircle className={isSm ? "w-3 h-3" : "w-4 h-4"} />
      <span className="capitalize">{status}</span>
    </span>
  );
}
