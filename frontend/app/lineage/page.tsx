"use client";

import React, { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { GitBranch, ShieldAlert, Info } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";

export default function LineagePage() {
  const [traces, setTraces] = useState<string[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<string>("");
  const [summary, setSummary] = useState<any>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch list of available traces from recent events
  useEffect(() => {
    fetch("/api/events?limit=100")
      .then((r) => r.json())
      .then((evs) => {
        if (Array.isArray(evs)) {
          const uniqueTraces = Array.from(new Set(evs.map((e: any) => e.trace_id).filter(Boolean))) as string[];
          setTraces(uniqueTraces);
          if (uniqueTraces.length > 0) {
            setSelectedTrace(uniqueTraces[0]);
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const loadTraceDag = useCallback((traceId: string) => {
    if (!traceId) return;
    setLoading(true);
    fetch(`/api/lineage/${traceId}`)
      .then((r) => r.json())
      .then((dag) => {
        const styledNodes = (dag.nodes || []).map((n: any) => ({
          ...n,
          style: {
            background: "#ffffff",
            color: "#1e293b",
            border: n.data?.incident ? "2px solid #f43f5e" : "1.5px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: n.data?.incident
              ? "0 4px 14px rgba(244, 63, 94, 0.2), 6px 6px 14px #d1d9e6, -6px -6px 14px #ffffff"
              : "6px 6px 14px #d1d9e6, -6px -6px 14px #ffffff",
            padding: "10px 14px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          },
        }));

        setNodes(styledNodes);
        setEdges(dag.edges || []);
        setSummary(dag.summary || null);
        if (dag.nodes && dag.nodes.length > 0) {
          setSelectedNodeData(dag.nodes[0].data);
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (selectedTrace) {
      loadTraceDag(selectedTrace);
    }
  }, [selectedTrace, loadTraceDag]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Trace Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center space-x-3">
            <GitBranch className="w-8 h-8 text-blue-600" />
            <span>Distributed Lineage DAG</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Visual trace span provenance, inter-agent delegation & causal incident localization
          </p>
        </div>

        {/* Trace Selector Dropdown */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Trace:</label>
          <div className="clay-card p-1 rounded-2xl">
            <select
              value={selectedTrace}
              onChange={(e) => setSelectedTrace(e.target.value)}
              className="bg-transparent text-slate-800 text-sm font-mono font-semibold px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {traces.map((t) => (
                <option key={t} value={t} className="bg-white text-slate-800 font-mono">
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats Strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 clay-card p-5">
          <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Spans</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{summary.total_events}</div>
          </div>
          <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Trace Duration</div>
            <div className="text-2xl font-black text-slate-800 mt-1">{summary.total_duration_ms} ms</div>
          </div>
          <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Token Footprint</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {summary.total_tokens.toLocaleString()}
            </div>
          </div>
          <div className="clay-inset p-3.5 rounded-2xl bg-slate-50/60">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Incidents on Trace</div>
            <div className={`text-2xl font-black mt-1 ${summary.incident_count > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {summary.incident_count}
            </div>
          </div>
        </div>
      )}

      {/* React Flow Lineage Canvas + Node Inspector Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[650px]">
        {/* React Flow Canvas (2 cols) */}
        <div className="lg:col-span-2 clay-card overflow-hidden relative p-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            className="bg-[#f8fafc] rounded-2xl"
          >
            <Background color="#cbd5e1" gap={20} size={1.2} />
            <Controls className="bg-white text-slate-700 border-slate-200/80 fill-slate-700 shadow-md rounded-xl" />
            <MiniMap
              nodeColor={(n) => (n.data?.incident ? "#f43f5e" : "#3b82f6")}
              className="bg-white border border-slate-200/80 rounded-2xl shadow-sm"
            />
          </ReactFlow>
        </div>

        {/* Node Detail Inspector (1 col) */}
        <div className="clay-card p-6 flex flex-col justify-between overflow-y-auto">
          {selectedNodeData ? (
            <div className="space-y-5">
              <div className="border-b border-slate-200/70 pb-3">
                <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-xs">
                  {selectedNodeData.event_type}
                </span>
                <h3 className="text-lg font-bold text-slate-800 mt-2">
                  {selectedNodeData.label}
                </h3>
                <div className="text-xs font-mono text-slate-500 mt-1">
                  Agent: <span className="text-blue-600 font-bold">{selectedNodeData.agent_id}</span>
                </div>
              </div>

              {/* Status & Incident Alert */}
              <div className="flex items-center space-x-3">
                <StatusBadge status={selectedNodeData.status || "success"} />
                {selectedNodeData.incident && (
                  <SeverityBadge
                    severity={selectedNodeData.incident.severity}
                  />
                )}
              </div>

              {selectedNodeData.incident && (
                <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-800 shadow-xs">
                  <div className="font-bold flex items-center space-x-1.5 text-rose-700 mb-1">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    <span>AEGIS Flagged Anomaly:</span>
                  </div>
                  <div className="font-medium">{selectedNodeData.incident.title}</div>
                </div>
              )}

              {/* Span Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 clay-inset">
                  <div className="text-slate-500 font-bold">Duration</div>
                  <div className="text-base font-black text-slate-800 mt-1">
                    {selectedNodeData.duration_ms} ms
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 clay-inset">
                  <div className="text-slate-500 font-bold">Tokens</div>
                  <div className="text-base font-black text-indigo-600 mt-1">
                    {selectedNodeData.tokens}
                  </div>
                </div>
              </div>

              {/* Attributes Metadata */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Span Attributes (JSON)
                </h4>
                <pre className="clay-inset p-3.5 rounded-2xl bg-slate-50 text-xs font-mono text-slate-800 overflow-x-auto max-h-56">
                  {JSON.stringify(selectedNodeData.attributes || {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm font-medium">
              <Info className="w-8 h-8 text-slate-400 mb-2" />
              Click any node on the DAG canvas to inspect its span telemetry and attributes.
            </div>
          )}

          <div className="text-[11px] font-medium text-slate-400 pt-4 border-t border-slate-200/60">
            Trace context propagated across LangChain, CrewAI & AutoGen adapters.
          </div>
        </div>
      </div>
    </div>
  );
}
