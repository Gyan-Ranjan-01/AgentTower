"use client";

import React, { useEffect, useState, useCallback } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from "reactflow";
import "reactflow/dist/style.css";
import { GitBranch, Clock, Cpu, ShieldAlert, CheckCircle, Info } from "lucide-react";
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
        setNodes(dag.nodes || []);
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
    <div className="space-y-6">
      {/* Top Header & Trace Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <GitBranch className="w-8 h-8 text-blue-400" />
            <span>Distributed Lineage DAG</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visual trace span provenance, inter-agent delegation & causal incident localization
          </p>
        </div>

        {/* Trace Selector Dropdown */}
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-400 uppercase">Select Trace:</label>
          <select
            value={selectedTrace}
            onChange={(e) => setSelectedTrace(e.target.value)}
            className="bg-surface border border-surface-border text-slate-200 text-sm font-mono rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
          >
            {traces.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats Strip */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface p-4 rounded-xl border border-surface-border">
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Spans</div>
            <div className="text-2xl font-bold text-white mt-0.5">{summary.total_events}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Trace Duration</div>
            <div className="text-2xl font-bold text-white mt-0.5">{summary.total_duration_ms} ms</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Token Footprint</div>
            <div className="text-2xl font-bold text-indigo-400 mt-0.5">
              {summary.total_tokens.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Incidents on Trace</div>
            <div className="text-2xl font-bold text-rose-400 mt-0.5">
              {summary.incident_count}
            </div>
          </div>
        </div>
      )}

      {/* React Flow Lineage Canvas + Node Inspector Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[650px]">
        {/* React Flow Canvas (2 cols) */}
        <div className="lg:col-span-2 bg-[#080d1a] rounded-xl border border-surface-border overflow-hidden relative shadow-2xl">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            className="bg-slate-950"
          >
            <Background color="#1e293b" gap={20} size={1} />
            <Controls className="bg-surface text-white border-surface-border fill-white" />
            <MiniMap
              nodeColor={(n) => (n.data?.incident ? "#ef4444" : "#3b82f6")}
              className="bg-surface border border-surface-border rounded-lg"
            />
          </ReactFlow>
        </div>

        {/* Node Detail Inspector (1 col) */}
        <div className="bg-surface rounded-xl border border-surface-border p-6 shadow-lg flex flex-col justify-between overflow-y-auto">
          {selectedNodeData ? (
            <div className="space-y-5">
              <div className="border-b border-surface-border pb-3">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700">
                  {selectedNodeData.event_type}
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  {selectedNodeData.label}
                </h3>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  Agent: <span className="text-blue-400 font-semibold">{selectedNodeData.agent_id}</span>
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
                <div className="p-3.5 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
                  <div className="font-bold flex items-center space-x-1.5 text-red-300 mb-1">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    <span>AEGIS Flagged Anomaly:</span>
                  </div>
                  <div>{selectedNodeData.incident.title}</div>
                </div>
              )}

              {/* Span Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
                  <div className="text-slate-400">Duration</div>
                  <div className="text-base font-bold text-white mt-1">
                    {selectedNodeData.duration_ms} ms
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-surface-card border border-surface-border">
                  <div className="text-slate-400">Tokens</div>
                  <div className="text-base font-bold text-white mt-1">
                    {selectedNodeData.tokens}
                  </div>
                </div>
              </div>

              {/* Attributes Metadata */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Span Attributes (JSON)
                </h4>
                <pre className="bg-[#0b1220] p-3 rounded-lg border border-surface-border text-xs font-mono text-emerald-400 overflow-x-auto max-h-56">
                  {JSON.stringify(selectedNodeData.attributes || {}, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
              <Info className="w-8 h-8 text-slate-500 mb-2" />
              Click any node on the DAG canvas to inspect its span telemetry and attributes.
            </div>
          )}

          <div className="text-[11px] text-slate-500 pt-4 border-t border-surface-border">
            Trace context propagated across LangChain, CrewAI & AutoGen adapters.
          </div>
        </div>
      </div>
    </div>
  );
}
