"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  GitBranch,
  CheckCircle,
  Wrench,
  DollarSign,
  History,
  PlayCircle,
  Activity,
  Layers,
  RotateCcw,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const [llmMode, setLlmMode] = useState<string>("scripted");
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.llm_mode) setLlmMode(d.llm_mode);
      })
      .catch(() => {});

    const es = new EventSource("/api/sse");
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);
    return () => es.close();
  }, []);

  const handleQuickReset = async () => {
    if (confirm("Reset AgentTower to clean baseline state (<10s)?")) {
      setResetting(true);
      try {
        await fetch("/api/demo/reset", { method: "POST" });
        window.location.reload();
      } catch (e) {
        alert("Reset failed: " + e);
      } finally {
        setResetting(false);
      }
    }
  };

  const navItems = [
    { href: "/", label: "Overview", icon: Layers },
    { href: "/lineage", label: "Lineage DAG", icon: GitBranch },
    { href: "/incidents", label: "Incidents", icon: ShieldAlert },
    { href: "/approvals", label: "Decision Gate", icon: CheckCircle },
    { href: "/remediation", label: "Remediation", icon: Wrench },
    { href: "/cost", label: "Cost Attribution", icon: DollarSign },
    { href: "/replay", label: "Audit & Replay", icon: History },
    { href: "/demo", label: "Demo Controls", icon: PlayCircle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-3 shadow-[0_4px_16px_rgba(203,213,225,0.4)]">
      <div className="flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-[4px_4px_10px_#cbd5e1,-3px_-3px_8px_#ffffff] group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl text-slate-800 tracking-tight">
                  Agent<span className="text-indigo-600">Tower</span>
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
                  L&T TECHgium
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Autonomous Agent Governance Console</p>
            </div>
          </Link>

          {/* Nav Items as Tactile Clay Pills */}
          <nav className="hidden lg:flex items-center space-x-1.5 bg-[#f1f5f9] p-1.5 rounded-2xl shadow-[inset_2px_2px_4px_#cbd5e1,inset_-2px_-2px_4px_#ffffff]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-[3px_3px_8px_#cbd5e1,-2px_-2px_6px_#ffffff]"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center space-x-3.5">
          {/* SSE Stream status pill */}
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 bg-[#f8fafc] px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>{sseConnected ? "Live Telemetry" : "Disconnected"}</span>
          </div>

          {/* LLM Mode Badge */}
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[#f8fafc] border border-slate-200 shadow-sm text-slate-700">
            <span className="text-slate-400 font-sans">LLM Mode:</span>
            <span className={llmMode === "live" ? "text-emerald-600 font-bold" : "text-indigo-600 font-bold"}>
              {llmMode}
            </span>
          </div>

          {/* Fast Reset Clay Button */}
          <button
            onClick={handleQuickReset}
            disabled={resetting}
            title="Fast Reset state to clean baseline (<10s)"
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 shadow-[2px_2px_6px_#fecdd3,-2px_-2px_6px_#ffffff] transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
            <span>{resetting ? "Resetting..." : "Reset State"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
