"use client";

import React from "react";
import { Cpu, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AdaptiveIntelligenceControl } from "@/components/AdaptiveIntelligenceControl";

export default function AdaptiveIntelligencePage() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="clay-btn inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-800 font-bold px-3 py-1.5 rounded-xl mb-3 transition-transform"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Console Overview</span>
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-3">
            <Cpu className="w-8 h-8 text-blue-600" />
            <span>Adaptive Intelligence & Cost Control</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Dynamic model tiering, continuous lightweight monitoring bots, and event-driven supervisor escalation
          </p>
        </div>
      </div>

      <AdaptiveIntelligenceControl />
    </div>
  );
}

