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
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-red-950/80 border border-red-700 text-red-200 text-sm font-semibold shadow-sm">
        <AlertOctagon className="w-4 h-4 text-red-400" />
        <span>Critical</span>
        {confidence !== undefined && (
          <span className="ml-1 text-xs opacity-75">({Math.round(confidence * 100)}%)</span>
        )}
      </span>
    );
  }

  if (sev === "medium") {
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-amber-950/70 border border-amber-700 text-amber-200 text-sm font-semibold shadow-sm">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        <span>Medium</span>
        {confidence !== undefined && (
          <span className="ml-1 text-xs opacity-75">({Math.round(confidence * 100)}%)</span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-md bg-slate-800 border border-slate-600 text-slate-300 text-sm font-semibold shadow-sm">
      <Info className="w-4 h-4 text-slate-400" />
      <span>Low</span>
      {confidence !== undefined && (
        <span className="ml-1 text-xs opacity-75">({Math.round(confidence * 100)}%)</span>
      )}
    </span>
  );
}

