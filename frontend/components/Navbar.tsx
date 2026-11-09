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
    // Check mode
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => {
        if (d.llm_mode) setLlmMode(d.llm_mode);
      })
      .catch(() => {});

    // SSE connection check
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
    <header className="sticky top-0 z-50 bg-[#0c1222]/95 backdrop-blur border-b border-surface-border px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-wide">
                  Agent<span className="text-blue-400">Tower</span>
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  L&T TECHgium
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Framework-Agnostic Agent Control Plane</p>
            </div>
          </Link>

          {/* Navigation links */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Status Controls */}
        <div className="flex items-center space-x-4">
          {/* SSE Stream status */}
          <div className="flex items-center space-x-2 text-xs text-slate-400 bg-surface px-2.5 py-1 rounded-full border border-surface-border">
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span>{sseConnected ? "Live SSE Stream" : "Disconnected"}</span>
          </div>

          {/* LLM Mode Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-800 border border-slate-700 text-slate-300">
            <span className="text-slate-500">LLM Mode:</span>
            <span className={llmMode === "live" ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
              {llmMode}
            </span>
          </div>

          {/* Fast Reset Button */}
          <button
            onClick={handleQuickReset}
            disabled={resetting}
            title="Fast Reset state to clean baseline (<10s)"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900/60 hover:text-white transition-all disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? "animate-spin" : ""}`} />
            <span>{resetting ? "Resetting..." : "Reset State"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
