'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Shield,
  Upload,
  AlertTriangle,
  ShieldAlert,
  Activity,
  ArrowRight,
  Zap,
  TrendingUp,
  FileSearch,
  Clock,
  Blocks,
  BrainCircuit,
  MapPin,
  CheckCircle2,
  XCircle,
  Cpu,
  Radio,
  Sparkles,
  Lock,
  Copy,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { getHistory } from '@/lib/storage';
import { listCases, checkHealth } from '@/lib/api';
import { RISK_TIERS } from '@/lib/constants';
import { useTheme } from '@/context/ThemeContext';

function StatCard({ icon: Icon, label, value, color, subtitle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-5 flex items-center justify-between group overflow-hidden relative"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/10 to-transparent pointer-events-none rounded-bl-full" />
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `${color}15`,
            borderColor: `${color}40`,
            boxShadow: `0 0 15px ${color}20`,
          }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
            {value}
          </p>
          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">{label}</p>
          {subtitle && <p className="text-[10px] font-mono text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}

const LIVE_FEED_MOCK = [
  { time: '14:32:05', file: 'Invoice_Overdue_Wire.pdf', tag: 'MALWARE_SIG_MATCH', score: '99.1%', type: 'error' },
  { time: '14:31:42', file: 'Weekly_Executive_Report.xlsx', tag: 'CLEAN', score: '0.02%', type: 'clean' },
  { time: '14:31:15', file: 'Reset_Password_Notice.eml', tag: 'SUSPICIOUS_LINK', score: '74.5%', type: 'amber' },
  { time: '14:30:58', file: 'Sprint_Standup_Agenda.docx', tag: 'CLEAN', score: '0.11%', type: 'clean' },
  { time: '14:30:22', file: 'Urgent_Acquisition_Wire.eml', tag: 'BEC_ATTEMPT', score: '95.8%', type: 'error' },
];

export default function DashboardPage() {
  const [cases, setCases] = useState([]);
  const [health, setHealth] = useState({ status: 'checking' });
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    async function loadData() {
      try {
        const [backendCases, healthRes] = await Promise.all([
          listCases(50, 0),
          checkHealth(),
        ]);

        setHealth(healthRes);

        if (backendCases && backendCases.cases && backendCases.cases.length > 0) {
          const formatted = backendCases.cases.map(c => ({
            case_id: c.case_id,
            subject: c.original_filename || 'Email Payload Analysis',
            from: 'Uploaded EML',
            risk_score: c.risk_score,
            risk_classification: c.classification,
            timestamp: c.created_at,
            file_name: c.original_filename,
            file_size: c.file_size,
          }));
          setCases(formatted);
        } else {
          setCases(getHistory());
        }
      } catch (err) {
        console.warn('Dashboard loading error:', err);
        setCases(getHistory());
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalScans = cases.length;
  const threats = cases.filter(h => (h.risk_score || 0) > 25).length;
  const avgScore = totalScans > 0
    ? Math.round(cases.reduce((sum, h) => sum + (h.risk_score || 0), 0) / totalScans)
    : 0;
  const critical = cases.filter(h => h.risk_classification === 'CRITICAL RISK').length;

  const handleCopy = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredCases = cases.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.case_id && c.case_id.toLowerCase().includes(q)) ||
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.risk_classification && c.risk_classification.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Command Bar (Stitch Operator Lab Layout) */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-6 sm:p-8 relative overflow-hidden border-t-2 border-t-[var(--primary-cyan)] shadow-xl"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-mono font-bold bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--border-cyan)]">
                <span className="w-2 h-2 rounded-full bg-[var(--primary-cyan)] animate-pulse" />
                <span>CLINICAL FORENSIC INTELLIGENCE COMMAND</span>
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Operator-042 • Level 4 Clearance
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)]">
              Email Threat Deconstruction & <span className="gradient-text-cyan">Custody Ledger</span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Multi-vector cyber forensic workstation integrating RFC header deconstruction, geo-routed relay tracking, transformer AI/ML phishing inference, and cryptographic blockchain chain-of-custody verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/analyze"
              className="btn-cyber-primary flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold shadow-md hover:scale-105 transition-transform"
            >
              <Upload className="w-4 h-4" />
              <span>INGEST .EML PAYLOAD</span>
            </Link>
            <Link
              href="/blockchain"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs font-bold text-[var(--text-primary)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] border border-[var(--border-subtle)] hover:border-[var(--border-cyan)] transition-colors shadow-sm"
            >
              <Blocks className="w-4 h-4 text-[var(--primary-cyan)]" />
              <span>EXPLORE LEDGER</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileSearch}
          label="Total Evidences Scanned"
          value={totalScans}
          subtitle="Processed RFC 822 Payloads"
          color="#00e5ff"
          delay={0.05}
        />
        <StatCard
          icon={AlertTriangle}
          label="Threat Vectors Flagged"
          value={threats}
          subtitle="Score > 25 (Heuristics & ML)"
          color="#f59e0b"
          delay={0.1}
        />
        <StatCard
          icon={TrendingUp}
          label="Composite Threat Index"
          value={`${avgScore}/100`}
          subtitle="Weighted Risk Metric"
          color={avgScore > 65 ? '#ff334b' : avgScore > 35 ? '#f59e0b' : '#10b981'}
          delay={0.15}
        />
        <StatCard
          icon={ShieldAlert}
          label="Critical Attacks Neutralized"
          value={critical}
          subtitle="BEC & High-Severity Payloads"
          color="#ff334b"
          delay={0.2}
        />
      </div>

      {/* Stitch Bento Grid: AI NLP Spotlight & Pipeline Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AI NLP Classification Card (Stitch Component) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card rounded-xl p-6 lg:col-span-8 border-t-2 border-t-[var(--accent-red)] relative"
        >
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-[var(--accent-red)]" />
              <span>AI NLP Token Classification Spotlight</span>
            </h3>
            <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-full text-xs font-mono font-bold border border-rose-500/30">
              Phishing Confidence: 98.4%
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-secondary)] leading-relaxed shadow-inner">
            <span className="font-bold text-[var(--text-primary)]">Subject: </span>
            <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">URGENT</span>: Action Required - <span className="bg-rose-500/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">Verify</span> Your <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">Login Details</span> Immediately
            <br /><br />
            Dear Customer,<br />
            We have detected unusual activity on your corporate account. Please <span className="bg-rose-500/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">click here</span> to <span className="bg-rose-500/30 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">verify</span> your identity and prevent account suspension. Failure to act within 24 hours will result in permanent closure.
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs font-mono text-[var(--text-muted)]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-rose-500/40 rounded-sm inline-block" />
              <span>Critical Urgency Trigger</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-rose-500/20 rounded-sm inline-block" />
              <span>Coercive Action Anomaly</span>
            </div>
          </div>
        </motion.div>

        {/* Authentication Cryptographic Health (Stitch Component) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-6 lg:col-span-4 flex flex-col justify-between"
        >
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[var(--primary-cyan)]" />
              <span>Cryptographic Auth Badges</span>
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-[var(--surface-container-low)] rounded-lg border border-[var(--border-cyan)]/30">
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">SPF Record</span>
                <span className="bg-[var(--primary-cyan)]/15 text-[var(--primary-cyan)] border border-[var(--border-cyan)] px-2.5 py-0.5 rounded text-xs font-mono font-bold">PASS</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-[var(--surface-container-low)] rounded-lg border border-[var(--border-cyan)]/30">
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">DKIM Signature</span>
                <span className="bg-[var(--primary-cyan)]/15 text-[var(--primary-cyan)] border border-[var(--border-cyan)] px-2.5 py-0.5 rounded text-xs font-mono font-bold">PASS</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-rose-500/10 rounded-lg border border-rose-500/40">
                <span className="font-mono text-xs font-bold text-[var(--text-primary)]">DMARC Policy</span>
                <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded text-xs font-mono font-bold shadow-sm">FAIL</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between">
            <span>DNS Resolver: 1.1.1.1</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized
            </span>
          </div>
        </motion.div>
      </div>

      {/* Stitch Bento Grid: Forensic Ledger & Relay Path */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Blockchain Forensic Ledger (Stitch Component) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-xl p-6 lg:col-span-6 border-t-2 border-t-[var(--primary-cyan)]"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Blocks className="w-5 h-5 text-[var(--primary-cyan)]" />
              <span>Forensic Proof-of-Custody Ledger</span>
            </h3>
            <Link href="/blockchain" className="text-xs font-mono text-[var(--primary-cyan)] hover:underline flex items-center gap-1">
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="py-2.5 px-2 font-semibold">Block Hash</th>
                  <th className="py-2.5 px-2 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-2 font-semibold">Integrity</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-container)] transition-colors group">
                  <td className="py-3 px-2 text-[var(--primary-cyan)] flex items-center gap-2">
                    <span className="font-bold">0x8f4...2e9a</span>
                    <button
                      onClick={() => handleCopy('0x8f4c2e9a3b1d7f8a5c2e9a')}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedHash === '0x8f4c2e9a3b1d7f8a5c2e9a' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td className="py-3 px-2 text-[var(--text-secondary)]">2026-09-07T06:32:01Z</td>
                  <td className="py-3 px-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></td>
                </tr>
                <tr className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-container)] transition-colors group">
                  <td className="py-3 px-2 text-[var(--primary-cyan)] flex items-center gap-2">
                    <span className="font-bold">0x3b1...7c4f</span>
                    <button
                      onClick={() => handleCopy('0x3b1d7c4f8a2b5e9f1a2c3d')}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedHash === '0x3b1d7c4f8a2b5e9f1a2c3d' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td className="py-3 px-2 text-[var(--text-secondary)]">2026-09-07T06:15:20Z</td>
                  <td className="py-3 px-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></td>
                </tr>
                <tr className="hover:bg-[var(--surface-container)] transition-colors group">
                  <td className="py-3 px-2 text-[var(--primary-cyan)] flex items-center gap-2">
                    <span className="font-bold">0x9a2...1d8b</span>
                    <button
                      onClick={() => handleCopy('0x9a2b1d8bc3e4f5a6b7c8d9')}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedHash === '0x9a2b1d8bc3e4f5a6b7c8d9' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                  <td className="py-3 px-2 text-[var(--text-secondary)]">2026-09-07T05:54:11Z</td>
                  <td className="py-3 px-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Interactive Relay Path Timeline (Stitch Component) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-6 lg:col-span-6 relative overflow-hidden"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--primary-cyan)]" />
              <span>Multi-Hop Relay Trajectory</span>
            </h3>
            <Link href="/map" className="text-xs font-mono text-[var(--primary-cyan)] hover:underline flex items-center gap-1">
              <span>Geo Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border-subtle)] space-y-4">
            <div className="relative">
              <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-[var(--surface-base)]" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Hop 1: Origin Server</p>
                  <p className="font-mono text-xs text-rose-500 font-bold">185.220.101.45 (Russia - Suspicious ASN)</p>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Latency: 45ms</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--primary-cyan)] ring-4 ring-[var(--surface-base)]" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Hop 2: Intermediate Relay</p>
                  <p className="font-mono text-xs text-[var(--text-secondary)]">mail-relay.attacker-vps.ru</p>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Latency: 14ms</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-[var(--surface-base)]" />
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">Hop 3: Target Enterprise MX</p>
                  <p className="font-mono text-xs text-[var(--text-secondary)]">mx.target-enterprise.com (Quarantined)</p>
                </div>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Latency: 2ms</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Live Threat Activity Feed (Stitch Component) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Radio className="w-5 h-5 text-[var(--primary-cyan)] animate-pulse" />
            <span>Real-Time Sensor Telemetry Feed</span>
          </h3>
          <span className="text-xs font-mono text-[var(--text-muted)] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Stream Online</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <tbody>
              {LIVE_FEED_MOCK.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-container)] transition-colors"
                >
                  <td className="py-2.5 px-2 text-[var(--text-muted)]">{row.time}</td>
                  <td className="py-2.5 px-2 font-bold text-[var(--text-primary)]">{row.file}</td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.type === 'error'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                          : row.type === 'amber'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {row.tag}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right font-bold text-[var(--text-primary)]">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Recent Cases Vault Table (Direct Backend Integration) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-[var(--primary-cyan)]" />
              <span>Recent Forensic Evidence Vault</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
              Live SQLite Database Persistence (FastAPI :8000)
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Search case, subject, severity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary-cyan)]"
              />
            </div>
            <Link
              href="/cases"
              className="text-xs font-mono text-[var(--primary-cyan)] hover:underline whitespace-nowrap"
            >
              All Cases →
            </Link>
          </div>
        </div>

        {filteredCases.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[var(--border-subtle)] rounded-xl">
            <ShieldAlert className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold text-[var(--text-primary)]">No Forensic Records Found</p>
            <p className="text-xs text-[var(--text-muted)] font-mono mt-1">
              Ingest an email payload in the Forensic Studio to initialize records.
            </p>
            <Link
              href="/analyze"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono font-bold btn-cyber-primary"
            >
              <Upload className="w-3.5 h-3.5" /> Launch Ingestion
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                  <th className="py-2.5 px-3 font-semibold">Case ID</th>
                  <th className="py-2.5 px-3 font-semibold">Subject / File</th>
                  <th className="py-2.5 px-3 font-semibold">Classification</th>
                  <th className="py-2.5 px-3 font-semibold">Risk Score</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.slice(0, 8).map((c) => {
                  const score = c.risk_score || 0;
                  const isHigh = score > 65;
                  const isMed = score > 25 && score <= 65;

                  return (
                    <tr
                      key={c.case_id}
                      className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-container)] transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-3 font-bold text-[var(--primary-cyan)]">
                        {c.case_id}
                      </td>
                      <td className="py-3 px-3 font-medium text-[var(--text-primary)] max-w-xs truncate">
                        {c.subject || c.file_name}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isHigh
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                              : isMed
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {c.risk_classification || (isHigh ? 'CRITICAL' : isMed ? 'SUSPICIOUS' : 'CLEAN')}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{score}/100</span>
                          <div className="w-16 h-1.5 rounded-full bg-[var(--surface-container-high)] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${score}%`,
                                backgroundColor: isHigh ? '#ff334b' : isMed ? '#f59e0b' : '#10b981',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-muted)]">
                        {c.timestamp ? new Date(c.timestamp).toLocaleTimeString() : 'Recent'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/report/${encodeURIComponent(c.case_id)}`}
                          className="inline-flex items-center gap-1 text-[var(--primary-cyan)] hover:underline font-bold"
                        >
                          <span>Analyze</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}
