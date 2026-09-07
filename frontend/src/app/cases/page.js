'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FolderArchive,
  Search,
  Filter,
  Trash2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  ExternalLink,
  Blocks,
  Download,
  RefreshCw
} from 'lucide-react';
import { listCases } from '@/lib/api';
import { getHistory, clearHistory } from '@/lib/storage';
import { RISK_TIERS } from '@/lib/constants';

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchCaseList = async () => {
    setLoading(true);
    try {
      const res = await listCases(100, 0);
      if (res && res.cases && res.cases.length > 0) {
        const formatted = res.cases.map(c => ({
          case_id: c.case_id,
          subject: c.original_filename || 'Email Forensic Analysis',
          from: 'Uploaded EML',
          risk_score: c.risk_score,
          risk_classification: c.classification,
          timestamp: c.created_at,
          file_name: c.original_filename,
          file_size: c.file_size,
          status: c.status,
        }));
        setCases(formatted);
      } else {
        setCases(getHistory());
      }
    } catch (err) {
      console.warn('Fallback to local storage:', err);
      setCases(getHistory());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseList();
  }, []);

  const handleClearLocal = () => {
    if (confirm('Clear local browser case cache? (Server SQLite records will remain intact)')) {
      clearHistory();
      fetchCaseList();
    }
  };

  const filtered = cases.filter(entry => {
    const term = search.toLowerCase();
    const matchesSearch =
      !search ||
      entry.case_id?.toLowerCase().includes(term) ||
      entry.subject?.toLowerCase().includes(term) ||
      entry.from?.toLowerCase().includes(term) ||
      entry.file_name?.toLowerCase().includes(term);

    const matchesTier = filterTier === 'ALL' || entry.risk_classification === filterTier;
    return matchesSearch && matchesTier;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary-cyan)]/15 border border-[var(--border-cyan)] flex items-center justify-center shadow-sm">
              <FolderArchive className="w-5 h-5 text-[var(--primary-cyan)]" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-[var(--text-primary)]">
              Forensic Case Vault
            </h1>
            <span className="badge text-[10px] bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--border-cyan)] font-bold">
              {cases.length} PERSISTED CASES
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">
            SQLite database storage synchronized with SHA-256 blockchain custody verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCaseList}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-[var(--text-primary)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container)] border border-[var(--border-subtle)] transition-all shadow-sm cursor-pointer"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--primary-cyan)]' : ''}`} />
            <span>Sync</span>
          </button>
          {cases.length > 0 && (
            <button
              onClick={handleClearLocal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all shadow-sm cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Cache</span>
            </button>
          )}
          <Link
            href="/analyze"
            className="btn-cyber-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold shadow-md hover:scale-105 transition-transform"
          >
            <span>+ New Analysis</span>
          </Link>
        </div>
      </motion.div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Case ID (CASE-...), Subject, Sender, or Filename..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary-cyan)] shadow-inner"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] shadow-inner">
          {['ALL', 'LOW RISK', 'MEDIUM RISK', 'HIGH RISK', 'CRITICAL RISK'].map(tier => {
            const active = filterTier === tier;
            return (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all ${
                  active
                    ? 'bg-[var(--surface-base)] text-[var(--primary-cyan)] border border-[var(--border-cyan)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tier === 'ALL' ? 'ALL' : tier.replace(' RISK', '')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Case List */}
      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FileSearch className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3 opacity-50" />
          <p className="text-sm font-mono font-bold text-[var(--text-primary)] mb-1">
            {cases.length === 0 ? 'No cases found in database.' : 'No cases match current filter criteria.'}
          </p>
          <p className="text-xs font-mono text-[var(--text-muted)] mb-4">
            Upload an EML message to persist evidence records.
          </p>
          <Link
            href="/analyze"
            className="btn-cyber-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold shadow-md"
          >
            Ingest New EML
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const tier = RISK_TIERS[item.risk_classification] || RISK_TIERS['LOW RISK'];
            return (
              <motion.div
                key={item.case_id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="glass-card p-4 hover:border-[var(--border-cyan)] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[var(--primary-cyan)]">
                      {item.case_id}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--surface-container)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                      {item.status || 'ANALYZED'}
                    </span>
                    {item.file_size && (
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        • {(item.file_size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                    {item.subject || 'No Subject'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                    </span>
                    {item.file_name && (
                      <span className="truncate max-w-xs">📎 {item.file_name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                  <div className="text-right">
                    <span className="text-xl font-mono font-black block" style={{ color: tier.color }}>
                      {item.risk_score}
                    </span>
                    <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase font-bold">SCORE</span>
                  </div>

                  <span
                    className="badge text-[10px] font-bold"
                    style={{
                      background: tier.bg,
                      color: tier.color,
                      borderColor: tier.border,
                      borderWidth: 1,
                    }}
                  >
                    {tier.label}
                  </span>

                  <Link
                    href={`/report/${encodeURIComponent(item.case_id)}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[var(--primary-cyan)] bg-[var(--primary-cyan)]/10 hover:bg-[var(--primary-cyan)]/20 border border-[var(--border-cyan)] transition-all shadow-sm"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
