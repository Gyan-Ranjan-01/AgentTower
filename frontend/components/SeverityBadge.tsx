"use client";

import React from "react";
import { AlertOctagon, AlertTriangle, Info } from "lucide-react";

interface SeverityBadgeProps {
  severity: "Critical" | "Medium" | "Low" | string;
  confidence?: number;
}

export function SeverityBadge({ severity, confidence }: SeverityBadgeProps) {
  const sev = severity.toLowerCase();

  if (sev === "critical") {
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-[2px_2px_5px_#fecdd3,-2px_-2px_5px_#ffffff]">
        <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
        <span>Critical</span>
        {confidence !== undefined && (
          <span className="ml-1 text-[11px] font-mono text-rose-600 font-semibold">
            ({Math.round(confidence * 100)}%)
          </span>
        )}
      </span>
    );
  }

  if (sev === "medium") {
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold shadow-[2px_2px_5px_#fde68a,-2px_-2px_5px_#ffffff]">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        <span>Medium</span>
        {confidence !== undefined && (
          <span className="ml-1 text-[11px] font-mono text-amber-700 font-semibold">
            ({Math.round(confidence * 100)}%)
          </span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold shadow-[2px_2px_5px_#e2e8f0,-2px_-2px_5px_#ffffff]">
      <Info className="w-3.5 h-3.5 text-slate-500" />
      <span>Low</span>
      {confidence !== undefined && (
        <span className="ml-1 text-[11px] font-mono text-slate-600 font-semibold">
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </span>
  );
}
