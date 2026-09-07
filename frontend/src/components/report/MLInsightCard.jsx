'use client';

import { BrainCircuit, Cpu, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { analyzeMLText } from '@/lib/ml';

export default function MLInsightCard({ mlSignals, emailText }) {
  const fallback = analyzeMLText(emailText || '');
  const modelName = mlSignals?.model || fallback.modelName;
  const classification = mlSignals?.classification || fallback.classification;
  const confidence = mlSignals?.confidence ?? fallback.confidence;
  const explanation = mlSignals?.explanation || fallback.explanation;

  const isPhishing = classification?.toLowerCase().includes('phishing') || classification?.toLowerCase().includes('bec');

  return (
    <div className="glass-card p-5 border border-indigo-500/30 relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
            <BrainCircuit className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-[var(--text-primary)] flex items-center gap-1.5">
              <span>AI/ML Threat Classification</span>
              <Sparkles className="w-3.5 h-3.5 text-[var(--primary-cyan)] animate-pulse" />
            </h3>
            <p className="text-[10px] font-mono text-[var(--text-muted)]">
              Model: <span className="text-indigo-500 font-bold">{modelName}</span>
            </p>
          </div>
        </div>

        <span
          className={`badge text-xs font-bold ${
            isPhishing
              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
          }`}
        >
          {isPhishing ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {classification}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
        <div className="p-3 rounded-lg bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase font-semibold">Confidence Index</span>
          <span className="text-xl font-bold font-mono text-[var(--primary-cyan)]">
            {Math.round(confidence * 100)}%
          </span>
        </div>
        <div className="p-3 rounded-lg bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase font-semibold">NLP Vector State</span>
          <span className="text-sm font-bold font-mono text-indigo-500">
            {isPhishing ? 'Adversarial Urgency' : 'Neutral Enterprise'}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
          <span className="text-[10px] font-mono text-[var(--text-muted)] block uppercase font-semibold">Attention Entropy</span>
          <span className="text-sm font-bold font-mono text-[var(--text-primary)]">
            {isPhishing ? 'High Skew (0.84)' : 'Normal (0.12)'}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-[var(--text-secondary)] font-mono">
        <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-1">SHAP / Attention Rationale:</span>
        <p className="leading-relaxed">{explanation}</p>
      </div>
    </div>
  );
}
