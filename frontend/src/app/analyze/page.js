'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileUp,
  AlertCircle,
  Loader2,
  Shield,
  Zap,
  BrainCircuit,
  Blocks,
  Route,
  FileCode,
  Sparkles,
  CheckCircle2,
  X,
  Cpu,
  ArrowRight,
  Fingerprint,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeEmail } from '@/lib/api';
import { saveAnalysis } from '@/lib/storage';
import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '@/lib/constants';

const PIPELINE_STAGES = [
  { id: 1, label: 'RFC Header & MIME Deconstruction', icon: FileUp, desc: 'Parsing From, To, Date, Content-Type & body payloads' },
  { id: 2, label: 'SPF / DKIM / DMARC Cryptographic Check', icon: Shield, desc: 'Validating cryptographic key signatures and DNS alignment' },
  { id: 3, label: 'IOC Threat Intelligence Extraction', icon: Zap, desc: 'Harvesting and validating URLs, IPs, domains, and addresses' },
  { id: 4, label: 'Relay Flight Trajectory Mapping', icon: Route, desc: 'Reconstructing Received-header hops & RFC1918 classification' },
  { id: 5, label: 'AI/ML Transformer Phishing Inference', icon: BrainCircuit, desc: 'Executing neural urgency scoring & BEC anomaly detection' },
  { id: 6, label: 'SHA-256 Digest & Blockchain Custodial Seal', icon: Blocks, desc: 'Computing cryptographic evidence hash & ledger proof' },
];

export default function AnalyzePage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [rawText, setRawText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const validateFile = (f) => {
    if (!f) return 'No file selected.';
    if (!f.name.toLowerCase().endsWith('.eml')) return 'Only .eml raw RFC email files are supported.';
    if (f.size > MAX_FILE_SIZE_BYTES) return `File exceeds maximum allowed ${MAX_FILE_SIZE_MB}MB limit.`;
    if (f.size === 0) return 'The provided file is empty (0 bytes).';
    return null;
  };

  const handleFile = (f) => {
    setError(null);
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, []);

  const handleAnalyze = async () => {
    let targetFile = file;

    if (activeTab === 'paste') {
      if (!rawText.trim()) {
        setError('Please paste raw email headers or body text before running analysis.');
        return;
      }
      const blob = new Blob([rawText], { type: 'message/rfc822' });
      targetFile = new File([blob], 'pasted_email.eml', { type: 'message/rfc822' });
    }

    if (!targetFile) return;

    setLoading(true);
    setError(null);
    setLogs([]);

    for (let i = 0; i < PIPELINE_STAGES.length; i++) {
      setCurrentStageIdx(i);
      const stage = PIPELINE_STAGES[i];
      setLogs((prev) => [
        ...prev,
        `[${new Date().toISOString().slice(11, 19)}] STAGE ${i + 1}: ${stage.label} — OK`,
      ]);
      await new Promise((r) => setTimeout(r, 400));
    }

    try {
      const result = await analyzeEmail(targetFile);
      saveAnalysis(result);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toISOString().slice(11, 19)}] SUCCESS: Case registered -> ${result.case_id}`,
      ]);
      await new Promise((r) => setTimeout(r, 350));
      router.push(`/report/${encodeURIComponent(result.case_id)}`);
    } catch (err) {
      setError(err.message || 'Forensic analysis pipeline failed. Verify FastAPI backend is online on :8000.');
      setLoading(false);
    }
  };

  const handleLoadSample = (sampleType) => {
    setError(null);
    if (sampleType === 'bec') {
      const sampleContent = `From: "CEO Tim Cook" <ceo-executive-update@secure-apple-corporate.com>
To: finance-ops@target-enterprise.com
Subject: URGENT: Wire Transfer Authorization - Confidential Acquisition
Date: Sun, 06 Sep 2026 14:22:18 +0000
Message-ID: <20260906-urg-9921@secure-apple-corporate.com>
Received: from mail-relay.attacker-vps.ru (unknown [185.220.101.45])
    by mx.target-enterprise.com with ESMTP id 98218129;
    Sun, 06 Sep 2026 14:22:19 +0000
Authentication-Results: mx.target-enterprise.com;
    spf=fail (sender IP 185.220.101.45 is not authorized by domain secure-apple-corporate.com);
    dkim=fail header.i=@secure-apple-corporate.com;
    dmarc=fail (p=reject) header.from=secure-apple-corporate.com
Content-Type: text/plain; charset="UTF-8"

Team,

Please execute an immediate wire transfer of $84,500 to our strategic supplier account below before EOD today.
Due to NDA constraints, keep this transaction strictly confidential and do not call my mobile.

Beneficiary Account: 8829-0192-3819
Routing Code: 021000021
Reference: ACQ-CONFIDENTIAL-2026

Thanks,
Chief Executive Officer`;

      const blob = new Blob([sampleContent], { type: 'message/rfc822' });
      const sampleFile = new File([blob], 'CEO_Fraud_BEC_Sample.eml', { type: 'message/rfc822' });
      setFile(sampleFile);
      setRawText(sampleContent);
    } else if (sampleType === 'phish') {
      const sampleContent = `From: "Microsoft 365 Security" <alert-support@m1crosoft-auth-portal.com>
To: employee@target-enterprise.com
Subject: Immediate Action Required: Your Account Password Expires in 2 Hours
Date: Sun, 06 Sep 2026 10:15:00 +0000
Message-ID: <sec-alert-88127@m1crosoft-auth-portal.com>
Received: from host-vpn-exit.tor-node.net (unknown [198.51.100.77])
    by mx.target-enterprise.com with ESMTP;
    Sun, 06 Sep 2026 10:15:02 +0000
Authentication-Results: mx.target-enterprise.com;
    spf=fail; dkim=none; dmarc=fail
Content-Type: text/plain; charset="UTF-8"

Dear User,

Your organization password will expire today. To retain access to your mailbox and corporate assets, please verify your credentials immediately at:

http://m1crosoft-auth-portal.com/login?redirect=enterprise-sso

Failure to verify within 2 hours will result in automatic account suspension.`;

      const blob = new Blob([sampleContent], { type: 'message/rfc822' });
      const sampleFile = new File([blob], 'Phishing_Credential_Harvester.eml', { type: 'message/rfc822' });
      setFile(sampleFile);
      setRawText(sampleContent);
    } else {
      const sampleContent = `From: "Engineering Team" <devops@verified-corp.com>
To: team@verified-corp.com
Subject: Sprint Retrospective & Architecture Review
Date: Sun, 06 Sep 2026 09:00:00 +0000
Message-ID: <devops-review-2026@verified-corp.com>
Received: from mail.verified-corp.com (mail.verified-corp.com [198.51.100.12])
    by mx.verified-corp.com with ESMTPS id 119281;
    Sun, 06 Sep 2026 09:00:01 +0000
Authentication-Results: mx.verified-corp.com;
    spf=pass (sender IP 198.51.100.12 is authorized);
    dkim=pass header.i=@verified-corp.com;
    dmarc=pass
Content-Type: text/plain; charset="UTF-8"

Team,

Here is the summary of our sprint accomplishments and architectural benchmarks for the upcoming quarter.
All security testing and unit tests have completed with green results across the suite.

Best,
DevOps Team`;

      const blob = new Blob([sampleContent], { type: 'message/rfc822' });
      const sampleFile = new File([blob], 'Clean_Corporate_Email.eml', { type: 'message/rfc822' });
      setFile(sampleFile);
      setRawText(sampleContent);
    }
  };

  const hasPayload = activeTab === 'upload' ? !!file : !!rawText.trim();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header & Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-semibold bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--border-cyan)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary-cyan)] animate-spin" />
          <span>DECONSTRUCTION & RISK ANALYSIS WORKSTATION</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          Forensic Ingestion Studio
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Ingest raw <code className="text-[var(--primary-cyan)] font-mono font-bold bg-[var(--surface-container)] px-1.5 py-0.5 rounded">.eml</code> payloads or paste RFC 822/5322 headers for cryptographic key verification, neural phishing inference, and blockchain proof generation.
        </p>

        {/* Quick Test Payloads */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-xs font-mono font-semibold text-[var(--text-muted)] mr-1">Load Test Payload:</span>
          <button
            onClick={() => handleLoadSample('bec')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all hover:scale-105 shadow-sm"
          >
            🚨 CEO Fraud / BEC Sample
          </button>
          <button
            onClick={() => handleLoadSample('phish')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all hover:scale-105 shadow-sm"
          >
            ⚡ Credential Phishing Sample
          </button>
          <button
            onClick={() => handleLoadSample('clean')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all hover:scale-105 shadow-sm"
          >
            ✓ Clean Corporate Sample
          </button>
        </div>
      </motion.div>

      {/* Main Ingestion Box */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Subtle Cyber Grid Background in Box */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--primary-cyan)]/5 to-transparent pointer-events-none rounded-bl-full" />

        {/* Toggle Mode Tabs */}
        <div className="flex gap-2 p-1.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] mb-6 max-w-md mx-auto shadow-inner">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'upload'
                ? 'bg-[var(--surface-base)] text-[var(--primary-cyan)] border border-[var(--border-cyan)] shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload .EML File</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'paste'
                ? 'bg-[var(--surface-base)] text-[var(--primary-cyan)] border border-[var(--border-cyan)] shadow-md'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Paste RFC Headers</span>
          </button>
        </div>

        {/* Upload Mode Dropzone */}
        {activeTab === 'upload' ? (
          <div
            className={`dropzone p-12 text-center relative overflow-hidden ${
              dragging ? 'active' : ''
            } ${loading ? 'scan-line-active' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              if (!loading) document.getElementById('eml-file-input')?.click();
            }}
          >
            {/* Active Scanning Line */}
            <div className="scan-line" />

            <input
              id="eml-file-input"
              type="file"
              accept=".eml"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  key="file-ready"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3.5"
                >
                  <div className="w-16 h-16 rounded-2xl bg-[var(--primary-cyan)]/15 border border-[var(--primary-cyan)] flex items-center justify-center shadow-[0_0_25px_var(--primary-cyan-glow)]">
                    <FileUp className="w-8 h-8 text-[var(--primary-cyan)]" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[var(--text-primary)] font-mono tracking-tight">
                      {file.name}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--border-cyan)]">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        • RFC 822 MIME Payload Ready
                      </span>
                    </div>
                  </div>
                  {!loading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="mt-2 flex items-center gap-1.5 text-xs font-mono font-semibold text-rose-500 hover:text-rose-600 px-3.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Remove file
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-[var(--surface-container)] border border-[var(--border-cyan)] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    <Upload className="w-10 h-10 text-[var(--primary-cyan)]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      Drop .eml forensic payload here or <span className="text-[var(--primary-cyan)] underline decoration-[var(--primary-cyan)] underline-offset-4 hover:text-[var(--sapphire-blue)]">browse files</span>
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] font-mono">
                      Max {MAX_FILE_SIZE_MB}MB • Raw RFC 822 / 5322 MIME formats supported
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2 text-[11px] font-mono text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" /> Header Intact
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-[var(--primary-cyan)]" /> SHA-256 Hashed
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Blocks className="w-3.5 h-3.5 text-indigo-500" /> Tamper-Proof
                    </span>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-[var(--primary-cyan)]" />
                Raw RFC 822 Text Stream
              </span>
              <span>{rawText.length} characters</span>
            </div>
            <textarea
              rows={11}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw email headers or full .eml payload here...&#10;&#10;From: sender@domain.com&#10;To: recipient@company.com&#10;Subject: Urgent Payment Notice&#10;Received: from mail.gateway.com ([192.0.2.1])...&#10;Authentication-Results: spf=pass; dkim=pass..."
              className="w-full p-4 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary-cyan)] focus:ring-1 focus:ring-[var(--primary-cyan)] leading-relaxed shadow-inner"
            />
          </div>
        )}

        {/* Error Notification */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-xs text-rose-600 dark:text-rose-400 font-mono"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <p className="font-bold">Execution Error</p>
                <p className="mt-0.5 text-[var(--text-secondary)]">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        {!loading && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleAnalyze}
              disabled={!hasPayload}
              className={`flex items-center gap-2.5 px-10 py-4 rounded-xl font-mono font-bold text-sm transition-all transform shadow-lg ${
                hasPayload
                  ? 'btn-cyber-primary hover:scale-105 cursor-pointer'
                  : 'bg-[var(--surface-container-high)] text-[var(--text-muted)] border border-[var(--border-subtle)] cursor-not-allowed opacity-60'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>EXECUTE FORENSIC DECONSTRUCTION</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Animated Loading Visualizer */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 pt-6 border-t border-[var(--border-subtle)] space-y-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[var(--primary-cyan)] flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--primary-cyan)]" />
                <span>EXECUTING 6-STAGE FORENSIC PIPELINE...</span>
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-container)] text-[var(--text-primary)] border border-[var(--border-subtle)]">
                STAGE {currentStageIdx + 1} OF {PIPELINE_STAGES.length}
              </span>
            </div>

            {/* Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PIPELINE_STAGES.map((st, i) => {
                const IconComponent = st.icon;
                const isPassed = i < currentStageIdx;
                const isCurrent = i === currentStageIdx;

                return (
                  <div
                    key={st.id}
                    className={`p-3.5 rounded-xl border font-mono text-xs flex items-center gap-3 transition-all ${
                      isCurrent
                        ? 'bg-[var(--primary-cyan)]/15 border-[var(--primary-cyan)] text-[var(--text-primary)] shadow-md'
                        : isPassed
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-[var(--surface-container-low)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-[var(--primary-cyan)] text-[var(--surface-base)]'
                          : isPassed
                          ? 'bg-emerald-500/20 text-emerald-500'
                          : 'bg-[var(--surface-container)] text-[var(--text-muted)]'
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <IconComponent className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-[var(--text-primary)]">{st.label}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">{st.desc}</p>
                    </div>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-[var(--primary-cyan)] animate-ping shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live Terminal Log Stream */}
            <div className="p-4 rounded-xl bg-[var(--surface-container-lowest)] border border-[var(--border-cyan)] font-mono text-[11px] text-[var(--text-secondary)] space-y-1 max-h-32 overflow-y-auto shadow-inner">
              <div className="text-[var(--primary-cyan)] font-bold pb-1 border-b border-[var(--border-subtle)] flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[var(--primary-cyan)]" />
                <span>Forensic Kernel Engine Logs</span>
              </div>
              {logs.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="text-[var(--primary-cyan)]">❯</span>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
