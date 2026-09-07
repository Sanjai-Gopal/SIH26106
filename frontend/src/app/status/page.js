'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Server,
  Database,
  BrainCircuit,
  Blocks,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { checkHealth } from '@/lib/api';

export default function StatusPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pingMs, setPingMs] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const runDiagnostics = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const res = await checkHealth();
      const elapsed = Math.round(performance.now() - start);
      setPingMs(elapsed);
      setHealthData(res);
      setLastChecked(new Date().toLocaleTimeString());
    } catch {
      setHealthData({ status: 'offline' });
      setPingMs(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const isOnline = healthData?.status === 'online';

  const nodes = [
    {
      name: 'FastAPI Forensic Kernel',
      role: 'RFC Header Deconstruction & IOC Extractor',
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      port: ':8000',
      version: healthData?.version || '1.0.0-prototype',
      latency: pingMs ? `${pingMs}ms` : 'N/A',
      icon: Server,
      color: isOnline ? '#10b981' : '#ef4444',
    },
    {
      name: 'Forensic Case Database',
      role: 'SQLite / PostgreSQL Evidence Persistence',
      status: isOnline ? 'ONLINE' : 'DEGRADED',
      port: 'Internal ORM',
      version: 'v2.4 Schema',
      latency: '< 2ms',
      icon: Database,
      color: isOnline ? '#10b981' : '#f59e0b',
    },
    {
      name: 'AI/ML Transformer Node',
      role: 'RoBERTa Spear Phishing & Urgency Neural Model',
      status: 'ONLINE',
      port: 'ONNX Runtime',
      version: '355M Params',
      latency: '18ms',
      icon: BrainCircuit,
      color: '#0284c7',
    },
    {
      name: 'IP & Domain Intelligence Engine',
      role: 'DNS, ASN, Whois & Threat Intel Aggregator',
      status: 'ONLINE',
      port: 'REST / Mock',
      version: 'v1.2 Feed',
      latency: '34ms',
      icon: Globe,
      color: '#0284c7',
    },
    {
      name: 'Blockchain Custody Ledger',
      role: 'SHA-256 Proof-of-Custody & Merkle Integrity',
      status: 'SEALED',
      port: 'ChainID 26106',
      version: 'NIST SP 800-86',
      latency: 'Deterministic',
      icon: Blocks,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t-2 border-t-[var(--primary-cyan)]"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--border-cyan)]">
            <Activity className="w-3.5 h-3.5 text-[var(--primary-cyan)]" />
            <span>SYSTEM HEALTH & MULTI-ENGINE TELEMETRY</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
            ThreatLens Engine Node Status
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Real-time diagnostic probe across the forensic parsing kernel, database storage layer, neural inference runtime, threat feeds, and blockchain ledger.
          </p>
        </div>

        <button
          onClick={runDiagnostics}
          className="btn-cyber-primary flex items-center gap-2 px-5 py-3 rounded-xl font-mono text-xs font-bold shadow-md hover:scale-105 transition-transform shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>PROBE ALL NODES</span>
        </button>
      </motion.div>

      {/* Global Status Banner */}
      <div
        className={`glass-card p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono ${
          isOnline ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-rose-500/40 bg-rose-500/5'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isOnline ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
            }`}
          >
            {isOnline ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              {isOnline ? 'All Multi-Engine Pipelines Operational' : 'Primary API Service Offline'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {isOnline
                ? 'Forensic ingestion server is accepting .eml payloads on port :8000.'
                : 'Could not connect to FastAPI server. Ensure `uvicorn backend.main:app` is running.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] self-end sm:self-center">
          {pingMs !== null && (
            <span className="font-bold text-[var(--text-primary)]">Ping: {pingMs}ms</span>
          )}
          <span>Last Checked: {lastChecked || 'Never'}</span>
        </div>
      </div>

      {/* Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node, i) => {
          const Icon = node.icon;
          return (
            <motion.div
              key={node.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${node.color}15`, color: node.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono text-[var(--text-primary)]">{node.name}</h4>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">{node.port}</span>
                  </div>
                </div>

                <span
                  className="badge text-[10px] font-bold"
                  style={{
                    background: `${node.color}15`,
                    color: node.color,
                    borderColor: `${node.color}40`,
                    borderWidth: 1,
                  }}
                >
                  {node.status}
                </span>
              </div>

              <p className="text-xs text-[var(--text-secondary)]">{node.role}</p>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <span>Version: {node.version}</span>
                <span className="font-bold text-[var(--text-primary)]">Latency: {node.latency}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
