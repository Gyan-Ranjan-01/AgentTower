"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, Cpu, CheckCircle2, Zap } from "lucide-react";
import { fallbackPricingCatalog } from "@/lib/fallbackStore";

export function ModelPricingPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [pricing, setPricing] = useState<any[]>(fallbackPricingCatalog);
  const [loading, setLoading] = useState(false);

  const fetchPricing = async () => {
    try {
      const res = await fetch("/api/models/pricing");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.catalog) && data.catalog.length > 0) {
          setPricing(data.catalog);
        }
      }
    } catch (err) {
      // Keep fallback pricing catalog
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Interactive Trigger Pill / Icon */}
      <div
        className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center clay-inset cursor-pointer hover:scale-105 transition-transform"
        title="Hover to view model pricing rates & active status"
        role="button"
        tabIndex={0}
      >
        <DollarSign className="w-4 h-4" />
      </div>

      {/* Hover Claymorphic Popover Card */}
      {isOpen && (
        <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 clay-card p-4 border border-emerald-200/90 shadow-2xl transition-all">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Model Inference Rates</h4>
                <p className="text-[10px] text-slate-500 font-medium">Illustrative prototype rates per 1M tokens</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
              prices.yaml
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {pricing.map((m) => (
              <div
                key={m.model_id}
                className={`p-2.5 rounded-xl border text-xs transition-all ${
                  m.is_running
                    ? "bg-emerald-50/50 border-emerald-200 shadow-xs"
                    : "bg-slate-50/50 border-slate-200/70"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-slate-800 font-mono text-[11px]">{m.model_id}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                        m.tier === "Economy"
                          ? "bg-emerald-100 text-emerald-800"
                          : m.tier === "Premium"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {m.tier}
                    </span>
                  </div>

                  {m.is_running ? (
                    <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Running ({m.active_instances})</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-medium">Standby</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 mt-1">
                  <span className="text-slate-500 truncate max-w-[170px] text-[10px]">{m.description}</span>
                  <div className="text-right font-mono font-semibold">
                    <span className="text-slate-700">${m.input_usd_per_m.toFixed(2)} in</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-slate-700">${m.output_usd_per_m.toFixed(2)} out</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500 font-medium">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Economy tier delivers up to 96% cost reduction</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

