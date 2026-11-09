"use client";

import React, { useEffect, useState } from "react";
import { DollarSign, Cpu, BarChart3, PieChart as PieIcon, Info } from "lucide-react";
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

  const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-3">
            <DollarSign className="w-8 h-8 text-emerald-600" />
            <span>Granular Cost Attribution Engine</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Real-time token and USD cost attribution broken down by agent, organizational department, and task
          </p>
        </div>

        {/* Disclaimer Pill */}
        <div className="flex items-center space-x-2 text-xs text-slate-500 clay-card px-3.5 py-2 rounded-2xl font-medium">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Rates sourced from <strong className="font-mono text-slate-700">prices.yaml</strong></span>
        </div>
      </div>

      {/* Aggregate KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-card p-5">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Attributed Cost</span>
          <div className="text-4xl font-black text-emerald-600 tracking-tight mt-2">
            ${(costData?.total_cost_usd || 0.0).toFixed(4)}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">Sum of all tracked inference events</div>
        </div>

        <div className="clay-card p-5">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Total Token Consumption</span>
          <div className="text-4xl font-black text-slate-800 tracking-tight mt-2">
            {(costData?.total_tokens || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">Prompt tokens + Completion tokens</div>
        </div>

        <div className="clay-card p-5">
          <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Active Entities</span>
          <div className="text-4xl font-black text-indigo-600 tracking-tight mt-2">
            {Object.keys(costData?.by_agent || {}).length} Agents / {Object.keys(costData?.by_team || {}).length} Teams
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">Correlated through OpenTelemetry spans</div>
        </div>
      </div>

      {/* Charts Strip: By Agent (Bar) & By Department (Pie) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cost by Agent Bar Chart */}
        <div className="clay-card p-6">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <span>Attributed Spend by Agent ($ USD)</span>
            </h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} angle={-15} textAnchor="end" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#1e293b", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }}
                  formatter={(val: any) => [`$${Number(val).toFixed(4)}`, "Cost USD"]}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost by Department / Team Pie Chart */}
        <div className="clay-card p-6">
          <div className="flex items-center justify-between border-b border-slate-200/70 pb-3 mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <PieIcon className="w-5 h-5 text-emerald-600" />
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
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#1e293b", borderRadius: "14px", boxShadow: "0 4px 14px rgba(0,0,0,0.08)", fontSize: 12, fontWeight: 600 }}
                  formatter={(val: any) => [`$${Number(val).toFixed(4)}`, "Cost USD"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Granular Task Attribution Table */}
      <div className="clay-card p-6">
        <h2 className="text-base font-bold text-slate-800 mb-4">Granular Task-Level Attribution</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 font-mono">
            <thead className="bg-slate-100/70 uppercase text-slate-500 font-bold border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">Task ID</th>
                <th className="px-5 py-3.5">Events Tracked</th>
                <th className="px-5 py-3.5">Token Total</th>
                <th className="px-5 py-3.5 text-right">Attributed Cost (USD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {costData?.by_task &&
                Object.values(costData.by_task).map((task: any) => (
                  <tr key={task.task_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 text-blue-600 font-bold">{task.task_id}</td>
                    <td className="px-5 py-3 text-slate-600">{task.events}</td>
                    <td className="px-5 py-3 text-indigo-600 font-bold">{task.tokens.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-emerald-600 font-black">
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
