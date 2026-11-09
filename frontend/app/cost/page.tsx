"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, Cpu, Layers, PieChart as PieIcon, BarChart3, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function CostPage() {
  const [costData, setCostData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cost")
      .then((r) => r.json())
      .then((d) => setCostData(d))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

  const agentChartData = costData?.by_agent
    ? Object.values(costData.by_agent).map((a: any) => ({
        name: a.agent_id,
        cost: a.cost_usd,
        tokens: a.tokens,
      }))
    : [];

  const teamChartData = costData?.by_team
    ? Object.values(costData.by_team).map((t: any) => ({
        name: t.team,
        value: t.cost_usd,
        tokens: t.tokens,
      }))
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-emerald-400" />
            <span>Granular Cost Attribution Engine</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time token and USD cost attribution broken down by agent, organizational department, and task
          </p>
        </div>

        {/* Disclaimer Pill */}
        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-surface px-3 py-1.5 rounded-lg border border-surface-border">
          <Info className="w-4 h-4 text-blue-400" />
          <span>Rates sourced from config/prices.yaml (illustrative prototype rates)</span>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-lg">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Attributed Cost</span>
          <div className="text-4xl font-extrabold text-emerald-400 tracking-tight mt-2">
            ${(costData?.total_cost_usd || 0.0).toFixed(4)}
          </div>
          <div className="text-xs text-slate-500 mt-2">Sum of all tracked inference events</div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-lg">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Token Consumption</span>
          <div className="text-4xl font-extrabold text-white tracking-tight mt-2">
            {(costData?.total_tokens || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-2">Prompt tokens + Completion tokens</div>
        </div>

        <div className="bg-surface rounded-xl border border-surface-border p-5 shadow-lg">
          <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Active Entities</span>
          <div className="text-4xl font-extrabold text-indigo-400 tracking-tight mt-2">
            {Object.keys(costData?.by_agent || {}).length} Agents / {Object.keys(costData?.by_team || {}).length} Teams
          </div>
          <div className="text-xs text-slate-500 mt-2">Correlated through OpenTelemetry-compatible spans</div>
        </div>
      </div>

      {/* Charts Strip: By Agent (Bar) & By Department (Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost by Agent Bar Chart */}
        <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span>Attributed Spend by Agent ($ USD)</span>
            </h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", fontSize: 12 }}
                  formatter={(val: any) => [`$${Number(val).toFixed(4)}`, "Cost USD"]}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost by Department / Team Pie Chart */}
        <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg">
          <div className="flex items-center justify-between border-b border-surface-border pb-3 mb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              <span>Spend Share by Organizational Team</span>
            </h2>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={teamChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {teamChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", fontSize: 12 }}
                  formatter={(val: any) => [`$${Number(val).toFixed(4)}`, "Cost USD"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Granular Task Attribution Table */}
      <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg">
        <h2 className="text-base font-bold text-white mb-4">Granular Task-Level Attribution</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#0b1324] uppercase text-slate-400 border-b border-surface-border">
              <tr>
                <th className="px-5 py-3">Task ID</th>
                <th className="px-5 py-3">Events Tracked</th>
                <th className="px-5 py-3">Token Total</th>
                <th className="px-5 py-3 text-right">Attributed Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {costData?.by_task &&
                Object.values(costData.by_task).map((task: any) => (
                  <tr key={task.task_id} className="hover:bg-slate-800/40">
                    <td className="px-5 py-3 text-blue-400 font-semibold">{task.task_id}</td>
                    <td className="px-5 py-3 text-slate-300">{task.events}</td>
                    <td className="px-5 py-3 text-indigo-400">{task.tokens.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-emerald-400 font-bold">
                      ${task.cost_usd.toFixed(4)}
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

