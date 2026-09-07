'use client';

import { ShieldAlert, AlertTriangle, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { SEVERITY_COLORS } from '@/lib/constants';

export default function SignalTable({ signals = [] }) {
  if (!signals || signals.length === 0) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <h3 className="text-sm font-bold font-mono text-[var(--text-primary)]">
            Triggered Forensic Risk Signals
          </h3>
        </div>
        <p className="text-center py-4 text-xs text-[var(--text-muted)] font-mono">
          ✓ No threat or adversarial rule signals triggered. Email passed baseline heuristic criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h3 className="text-sm font-bold font-mono text-[var(--text-primary)]">
            Triggered Forensic Risk Signals ({signals.length})
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          Cumulative Risk Weight Impact
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px]">
              <th className="pb-2 font-semibold">Signal Identifier</th>
              <th className="pb-2 font-semibold">Severity</th>
              <th className="pb-2 font-semibold">Score Impact</th>
              <th className="pb-2 font-semibold">Forensic Description & Rule Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {signals.map((sig, idx) => {
              const sev = sig.severity?.toUpperCase() || 'LOW';
              const config = SEVERITY_COLORS[sev] || SEVERITY_COLORS.LOW;

              return (
                <tr key={idx} className="hover:bg-[var(--surface-container)] transition-colors">
                  <td className="py-2.5 pr-3 text-[var(--primary-cyan)] font-bold whitespace-nowrap">
                    {sig.name}
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className="badge text-[10px] font-bold"
                      style={{
                        background: config.bg,
                        color: config.color,
                        borderColor: config.border,
                        borderWidth: 1,
                      }}
                    >
                      {sev}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 whitespace-nowrap">
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      +{sig.score_impact} pts
                    </span>
                  </td>
                  <td className="py-2.5 text-[var(--text-secondary)] font-sans text-xs leading-relaxed">
                    {sig.description}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
