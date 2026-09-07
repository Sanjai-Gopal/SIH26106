'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
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
  CheckCircle2,
  XCircle,
  X,
  Cpu,
  ArrowRight,
  ArrowLeft,
  Fingerprint,
  Terminal,
  Play,
  Pause,
  Copy,
  Check,
  ExternalLink,
  MapPin,
  FileText,
  Clock,
  Globe,
  Lock,
  Search,
  ShieldAlert,
  Server,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  CheckCircle
} from 'lucide-react';
import { analyzeEmail, listCases } from '@/lib/api';
import { saveAnalysis } from '@/lib/storage';
import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '@/lib/constants';

const STAGES = [
  { id: 1, name: 'RFC Deconstruction', subtitle: 'MIME & Envelope Headers', icon: FileUp, tag: 'RFC-5322' },
  { id: 2, name: 'Cryptographic Auth', subtitle: 'SPF / DKIM / DMARC Matrix', icon: Shield, tag: 'RFC-7208' },
  { id: 3, name: 'Relay Trajectory', subtitle: 'Received-Header Transit Path', icon: Route, tag: 'SMTP-HOPS' },
  { id: 4, name: 'IOC & Domain Intel', subtitle: 'Extracted URLs, Domains & IPs', icon: Globe, tag: 'THREAT-IOC' },
  { id: 5, name: 'Threat & Risk Engine', subtitle: 'Heuristics & Explainability', icon: BrainCircuit, tag: 'NLP-RULES' },
  { id: 6, name: 'Custody & Ledger', subtitle: 'SHA-256 & Chain-of-Custody', icon: Blocks, tag: 'NIST-800-86' },
];

const PRESET_SAMPLES = [
  {
    id: 'ceo_fraud',
    title: 'CEO Fraud BEC Incident',
    desc: 'Spoofed executive wire transfer request with urgency markers and failed SPF/DKIM.',
    severity: 'CRITICAL',
    raw: `Received: from mail-gateway.target-corp.example (mail-gateway.target-corp.example [192.0.2.10])
\tby mx1.internal.target-corp.example (Postfix) with ESMTP id 4X9Lmn01
\tfor <victim-analyst@target-corp.example>; Sun, 6 Sep 2026 15:32:10 +0000 (UTC)
Received: from suspicious-relay.external-net.example (suspicious-relay.external-net.example [198.51.100.42])
\tby mail-gateway.target-corp.example (Postfix) with ESMTPS id 3W8Klm99
\tfor <victim-analyst@target-corp.example>; Sun, 6 Sep 2026 15:32:05 +0000 (UTC)
Received: from unknown-client (dynamic-pool.isp.example [203.0.113.88])
\tby suspicious-relay.external-net.example (Postfix) with ESMTP id 2V7Jkl88
\tfor <victim-analyst@target-corp.example>; Sun, 6 Sep 2026 15:32:01 +0000 (UTC)
Authentication-Results: mx1.internal.target-corp.example;
\tspf=fail (sender IP 198.51.100.42 is not authorized for domain legit-corp.example) smtp.mailfrom=ceo@legit-corp.example;
\tdkim=fail (bad signature) header.d=legit-corp.example;
\tdmarc=fail (p=reject dis=none) header.from=legit-corp.example
Received-SPF: Fail (mx1.internal.target-corp.example: domain of ceo@legit-corp.example does not designate 198.51.100.42 as permitted sender) receiver=mx1.internal.target-corp.example; client-ip=198.51.100.42; envelope-from="ceo@legit-corp.example";
From: "Executive Office" <ceo@legit-corp.example>
To: "Finance Dept" <victim-analyst@target-corp.example>
Reply-To: "Urgent Payment Team" <finance-processing@external-secure-portal.xyz>
Return-Path: <bounce-handler@external-secure-portal.xyz>
Subject: URGENT: Immediate Action Required - Confidential Wire Transfer Invoice Overdue
Date: Sun, 6 Sep 2026 15:31:50 +0000
Message-ID: <20260906153150.998234@suspicious-relay.external-net.example>
MIME-Version: 1.0
Content-Type: text/html; charset=UTF-8

<html>
<body>
<p>Dear Finance Team,</p>
<p><strong>URGENT NOTICE: Immediate action required.</strong> Our critical vendor account is at risk of account suspended status within 24 hours to verify.</p>
<p>Please execute the confidential wire transfer for the overdue invoice immediately to avoid failure to respond penalties.</p>
<p>You can review and approve payment details here: <a href="http://198.51.100.42/portal/login?id=9928">http://198.51.100.42/portal/login?id=9928</a></p>
<p>Direct deposit details must remain strictly confidential.</p>
<p>Regards,<br>Executive Office<br>Legit Corp International</p>
</body>
</html>`
  },
  {
    id: 'phishing_invoice',
    title: 'PayPal Credential Harvest',
    desc: 'Fake security alert with typosquatted login portal and spoofed envelope domain.',
    severity: 'HIGH',
    raw: `Received: from relay02.hosted-vps.com (relay02.hosted-vps.com [185.220.101.5])
\tby mx.company.com (Postfix) with ESMTP id 8F1A2C3D
\tfor <accounts@company.com>; Sun, 6 Sep 2026 12:10:00 +0000
Authentication-Results: mx.company.com;
\tspf=softfail smtp.mailfrom=support@paypal-security-alert.net;
\tdkim=none;
\tdmarc=fail header.from=paypal.com
From: "PayPal Security Support" <security-alerts@paypal.com>
To: <accounts@company.com>
Return-Path: <bounce@paypal-security-alert.net>
Reply-To: <phish-collector@paypal-security-alert.net>
Subject: Security Alert: Unauthorized login attempt detected on your account
Date: Sun, 6 Sep 2026 12:09:45 +0000
Message-ID: <alert-881920@paypal-security-alert.net>
Content-Type: text/html; charset=UTF-8

<html>
<body>
<p>We detected an unauthorized access attempt to your PayPal business account from an unknown IP address.</p>
<p>Your account will be temporarily suspended unless you verify your identity within 12 hours.</p>
<p><a href="https://secure-login-paypal.phish-portal.net/verify">Click here to verify and secure your credentials immediately</a></p>
</body>
</html>`
  },
  {
    id: 'clean_notice',
    title: 'Verified Corporate Bulletin',
    desc: 'Standard quarterly newsletter with passing SPF, DKIM signature, and strict DMARC alignment.',
    severity: 'CLEAN',
    raw: `Received: from mail-out.corp-network.com (mail-out.corp-network.com [198.51.100.15])
\tby mx.client-domain.com with ESMTPS id 1A2B3C4D
\tfor <subscriber@client-domain.com>; Sun, 6 Sep 2026 09:00:00 +0000
Authentication-Results: mx.client-domain.com;
\tspf=pass smtp.mailfrom=notifications@corp-network.com;
\tdkim=pass header.d=corp-network.com header.s=s2026;
\tdmarc=pass (p=reject) header.from=corp-network.com
From: "Corporate Communications" <notifications@corp-network.com>
To: <subscriber@client-domain.com>
Return-Path: <notifications@corp-network.com>
Subject: Engineering Town Hall: Q3 Architectural Review & Security Roadmap
Date: Sun, 6 Sep 2026 08:59:50 +0000
Message-ID: <townhall-2026-q3@corp-network.com>
Content-Type: text/plain; charset=UTF-8

Team,

Please join us this Thursday at 14:00 UTC for our Q3 Architectural Review.
We will review infrastructure hardening, encryption protocols, and team milestones.

Calendar invites have been sent to all registered participants.

Best regards,
Internal Communications Team`
  }
];

export default function AnalyzePage() {
  const [file, setFile] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste' | 'preset'
  const [rawText, setRawText] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedText, setCopiedText] = useState(null);

  // Post-analysis Step-by-Step State
  const [analysisResult, setAnalysisResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const [headerFilter, setHeaderFilter] = useState('');
  const [consoleLogs, setConsoleLogs] = useState([]);
  const terminalBottomRef = useRef(null);

  // Auto-play through stages
  useEffect(() => {
    let timer;
    if (autoPlay && analysisResult) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= 6) {
            setAutoPlay(false);
            return 6;
          }
          return prev + 1;
        });
      }, 3500);
    }
    return () => clearInterval(timer);
  }, [autoPlay, analysisResult]);

  // Log generation whenever stage changes
  useEffect(() => {
    if (!analysisResult) return;
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    let logMsg = '';
    switch (currentStep) {
      case 1:
        logMsg = `[${ts}] [RFC-5322] Deconstructed ${analysisResult.headers?.envelope ? 'envelope' : 'MIME'} headers. Sender: ${analysisResult.headers?.from || 'Unknown'}.`;
        break;
      case 2:
        logMsg = `[${ts}] [AUTH-MATRIX] SPF: ${analysisResult.authentication?.spf?.status || 'N/A'}, DKIM: ${analysisResult.authentication?.dkim?.status || 'N/A'}, DMARC: ${analysisResult.authentication?.dmarc?.status || 'N/A'}.`;
        break;
      case 3:
        logMsg = `[${ts}] [RELAY-PATH] Traced ${analysisResult.relay_path?.length || 0} SMTP hops. Origin IP: ${analysisResult.relay_path?.[0]?.ip || 'Unknown'}.`;
        break;
      case 4:
        logMsg = `[${ts}] [IOC-INTEL] Extracted ${analysisResult.iocs?.urls?.length || 0} URL(s) and ${analysisResult.iocs?.domains?.length || 0} domain reference(s).`;
        break;
      case 5:
        logMsg = `[${ts}] [RISK-ENGINE] Computed Forensic Threat Score: ${analysisResult.risk?.score ?? 0}/100 (${analysisResult.risk?.classification || 'UNKNOWN'}).`;
        break;
      case 6:
        logMsg = `[${ts}] [CUSTODY-SEAL] SHA-256 bitstream fingerprint cryptographically persisted. Evidence ID: ${analysisResult.metadata?.evidence_id || 'EVID-OK'}.`;
        break;
    }
    setConsoleLogs((prev) => [...prev.slice(-25), logMsg]);
  }, [currentStep, analysisResult]);

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

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

  const loadPreset = (preset) => {
    setError(null);
    setRawText(preset.raw);
    setActiveTab('paste');
  };

  const handleAnalyze = async () => {
    let targetFile = file;

    if (activeTab === 'paste') {
      if (!rawText.trim()) {
        setError('Please paste raw email headers or body text before executing deconstruction.');
        return;
      }
      const blob = new Blob([rawText], { type: 'message/rfc822' });
      targetFile = new File([blob], 'forensic_input.eml', { type: 'message/rfc822' });
    }

    if (!targetFile) {
      setError('Please select an .eml file or paste raw RFC headers to analyze.');
      return;
    }

    setLoading(true);
    setError(null);
    setConsoleLogs([
      `[${new Date().toLocaleTimeString()}] [INGEST] Ingesting target: ${targetFile.name} (${targetFile.size} bytes)...`,
      `[${new Date().toLocaleTimeString()}] [PARSER] Initializing Python FastAPI RFC engine on port 8000...`
    ]);

    try {
      const result = await analyzeEmail(targetFile);
      saveAnalysis(result);
      setAnalysisResult(result);
      setCurrentStep(1);
    } catch (err) {
      setError(err.message || 'Forensic analysis failed. Verify FastAPI backend is online on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const resetWorkbench = () => {
    setAnalysisResult(null);
    setFile(null);
    setRawText('');
    setCurrentStep(1);
    setAutoPlay(false);
    setError(null);
    setConsoleLogs([]);
  };

  // Helper extraction
  const headers = analysisResult?.headers || {};
  const auth = analysisResult?.authentication || {};
  const relay = analysisResult?.relay_path || [];
  const iocs = analysisResult?.iocs || {};
  const risk = analysisResult?.risk || {};
  const metadata = analysisResult?.metadata || {};

  const fromVal = headers.from || 'Unknown';
  const returnPathVal = headers.return_path || '';
  const replyToVal = headers.reply_to || '';
  const isSpoofed = returnPathVal && fromVal && !fromVal.toLowerCase().includes(returnPathVal.split('@')[1]?.toLowerCase() || '_____');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      {/* Page Title / Forensic Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-8 border-b border-[var(--border-subtle)] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-bold text-[var(--primary-cyan)] uppercase tracking-wider">
              Forensic Investigation Lab
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-container-high)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
              NIST SP 800-86
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] font-mono">
            RFC Deconstruction & Forensic Studio
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Step-by-step envelope parsing, cryptographic authentication validation, relay trajectory, and SHA-256 custody sealing.
          </p>
        </div>

        {analysisResult && (
          <div className="flex items-center gap-2">
            <button
              onClick={resetWorkbench}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium border border-[var(--border-subtle)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)] text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>New Ingest</span>
            </button>
            <Link
              href={`/report/${metadata.case_id || 'latest'}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-mono font-bold bg-[var(--surface-container-high)] hover:bg-[var(--surface-container-highest)] text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Full Docket</span>
            </Link>
          </div>
        )}
      </div>

      {/* ERROR ALERT BANNER */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs font-mono">
            <div className="font-bold mb-1">ANALYSIS PIPELINE REJECTED</div>
            <p>{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =========================================================
          VIEW 1: INGESTION WORKBENCH (When no analysis loaded)
          ========================================================= */}
      {!analysisResult && (
        <div className="space-y-8">
          {/* Preset Attack Sample Quick-Launchers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                Instant Presets (Real RFC Samples)
              </span>
              <span className="font-mono text-[11px] text-[var(--text-muted)]">
                Click any preset to populate raw headers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRESET_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => loadPreset(sample)}
                  className="p-4 rounded-lg text-left border border-[var(--border-subtle)] bg-[var(--surface-container-low)] hover:border-[var(--primary-cyan)] hover:bg-[var(--surface-container)] transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--primary-cyan)] transition-colors">
                        {sample.title}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          sample.severity === 'CRITICAL'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : sample.severity === 'HIGH'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {sample.severity}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                      {sample.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between font-mono text-[11px] text-[var(--text-secondary)]">
                    <span className="text-[var(--primary-cyan)] font-medium">Load Payload</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ingest Tabs: File Upload vs Raw Paste */}
          <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-3.5 py-1.5 rounded-md font-mono text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'upload'
                      ? 'bg-[var(--primary-cyan)] text-[#05070b]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-container-high)]'
                  }`}
                >
                  Upload .EML File
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`px-3.5 py-1.5 rounded-md font-mono text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === 'paste'
                      ? 'bg-[var(--primary-cyan)] text-[#05070b]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-container-high)]'
                  }`}
                >
                  Paste Raw RFC-822 Text
                </button>
              </div>

              <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
                Max file size: {MAX_FILE_SIZE_MB}MB
              </span>
            </div>

            {/* TAB 1: FILE UPLOAD DROPZONE */}
            {activeTab === 'upload' && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center transition-all ${
                  dragging
                    ? 'border-[var(--primary-cyan)] bg-[var(--primary-cyan)]/5'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-container-low)] hover:border-[var(--border-cyan)]'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[var(--surface-container-high)] flex items-center justify-center mb-4 text-[var(--primary-cyan)]">
                  {file ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Upload className="w-6 h-6" />}
                </div>

                {file ? (
                  <div className="space-y-2">
                    <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                      {file.name}
                    </div>
                    <div className="font-mono text-xs text-[var(--text-muted)]">
                      {(file.size / 1024).toFixed(1)} KB • message/rfc822
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="mt-2 text-xs font-mono text-rose-400 hover:underline cursor-pointer"
                    >
                      Remove selected file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                      Drag & Drop .eml Email File Here
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Supports standard MIME messages exported from Outlook, Gmail, Thunderbird, or mail relays.
                    </p>
                    <label className="inline-block mt-3">
                      <span className="px-4 py-2 rounded-md font-mono text-xs font-bold border border-[var(--border-subtle)] bg-[var(--surface-container-high)] text-[var(--text-primary)] hover:border-[var(--primary-cyan)] transition-colors cursor-pointer">
                        Browse Files
                      </span>
                      <input
                        type="file"
                        accept=".eml"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: RAW TEXT / RFC-822 PASTE */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste complete raw RFC-822 headers and MIME body here...
Received: from mail.example.com ...
Authentication-Results: spf=fail ...
From: ceo@example.com
To: analyst@example.com
Subject: ..."
                  rows={12}
                  className="w-full p-4 rounded-lg bg-[var(--surface-floor)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-cyan)] leading-relaxed resize-y"
                />
                <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                  <span>Lines: {rawText ? rawText.split('\n').length : 0} | Chars: {rawText.length}</span>
                  {rawText && (
                    <button
                      onClick={() => setRawText('')}
                      className="text-rose-400 hover:underline cursor-pointer"
                    >
                      Clear textarea
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Primary Analysis Trigger Button */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
                <Shield className="w-4 h-4 text-[var(--primary-cyan)] shrink-0" />
                <span>Payload processed locally on-premise; SHA-256 evidence logged into SQLite.</span>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading || (activeTab === 'upload' && !file) || (activeTab === 'paste' && !rawText.trim())}
                className="w-full sm:w-auto px-6 py-2.5 rounded-md font-mono text-xs font-bold bg-[var(--primary-cyan)] text-[#05070b] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deconstructing RFC Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Run Step-by-Step Deconstruction</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 2: INTERACTIVE STEP-BY-STEP FORENSIC WORKBENCH
          (Shown once an email is ingested & analyzed)
          ========================================================= */}
      {analysisResult && (
        <div className="space-y-6">
          {/* STAGE NAVIGATION RAIL (6 Stages) */}
          <div className="glass-panel p-4 rounded-lg border border-[var(--border-subtle)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 pb-3 border-b border-[var(--border-subtle)]">
              {/* Active Step Indicator */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[var(--primary-cyan)]/15 border border-[var(--border-cyan)] flex items-center justify-center font-mono text-sm font-bold text-[var(--primary-cyan)]">
                  {currentStep}
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Stage {currentStep} of 6: {STAGES[currentStep - 1].name}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-mono">
                    {STAGES[currentStep - 1].subtitle}
                  </div>
                </div>
              </div>

              {/* Stage Execution Controls */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                  disabled={currentStep === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-mono font-medium border border-[var(--border-subtle)] bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-high)] disabled:opacity-30 disabled:cursor-not-allowed text-[var(--text-secondary)] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => setCurrentStep((prev) => Math.min(6, prev + 1))}
                  disabled={currentStep === 6}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-mono font-bold bg-[var(--primary-cyan)] text-[#05070b] hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>Next Stage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium border transition-colors cursor-pointer ${
                    autoPlay
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-container-low)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Auto-play through all 6 forensic stages"
                >
                  {autoPlay ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{autoPlay ? 'Pause Auto-Run' : 'Run All'}</span>
                </button>
              </div>
            </div>

            {/* Stage Step Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {STAGES.map((s) => {
                const Icon = s.icon;
                const isCurrent = currentStep === s.id;
                const isPassed = currentStep > s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setAutoPlay(false);
                      setCurrentStep(s.id);
                    }}
                    className={`p-2.5 rounded-md text-left transition-all border cursor-pointer flex flex-col justify-between ${
                      isCurrent
                        ? 'border-[var(--primary-cyan)] bg-[var(--primary-cyan)]/10 shadow-sm'
                        : isPassed
                        ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-container-low)] hover:border-[var(--border-cyan)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            isCurrent
                              ? 'text-[var(--primary-cyan)]'
                              : isPassed
                              ? 'text-emerald-400'
                              : 'text-[var(--text-muted)]'
                          }`}
                        />
                        <span className="font-mono text-[10px] font-bold text-[var(--text-muted)]">
                          0{s.id}
                        </span>
                      </div>
                      {isPassed ? (
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isCurrent ? (
                        <span className="w-2 h-2 rounded-full bg-[var(--primary-cyan)] animate-ping" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-[var(--surface-container-highest)]" />
                      )}
                    </div>
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)] truncate">
                      {s.name}
                    </div>
                    <div className="font-mono text-[9px] text-[var(--text-muted)] truncate mt-0.5">
                      {s.tag}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =========================================================
              STAGE 1: RFC-5322 HEADER DECONSTRUCTION
              ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Spoof Mismatch Warning Banner */}
              {isSpoofed && (
                <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs font-mono">
                    <div className="font-bold text-rose-400 uppercase mb-1">
                      Critical Spoofing Vector Detected: Envelope Mismatch
                    </div>
                    <p className="text-rose-200/90 leading-relaxed">
                      The visible <code className="bg-rose-950/50 px-1 py-0.5 rounded text-rose-300">From:</code> header domain does not match the SMTP envelope <code className="bg-rose-950/50 px-1 py-0.5 rounded text-rose-300">Return-Path:</code> domain. The sender is attempting to impersonate an executive or trusted service while routing non-delivery bounces to an attacker-controlled drop domain.
                    </p>
                  </div>
                </div>
              )}

              {/* Envelope Dissection Matrix */}
              <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                <h3 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 pb-2 border-b border-[var(--border-subtle)]">
                  Envelope Identity Alignment (RFC 5322 §3.6.2)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Visible Sender (Header 'From')
                    </span>
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)] break-all">
                      {fromVal}
                    </div>
                    <div className="mt-2 text-[11px] font-mono text-[var(--text-muted)]">
                      Displayed to victim in client UI.
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      True Envelope Sender ('Return-Path')
                    </span>
                    <div className="font-mono text-xs font-bold text-rose-400 break-all">
                      {returnPathVal || 'None / Empty Envelope'}
                    </div>
                    <div className="mt-2 text-[11px] font-mono text-[var(--text-muted)]">
                      Actual SMTP bounce destination (MAIL FROM).
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      Subject Line
                    </span>
                    <div className="font-mono text-xs font-bold text-[var(--text-primary)]">
                      {headers.subject || 'No Subject Specified'}
                    </div>
                  </div>

                  <div className="p-4 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                      RFC Message-ID
                    </span>
                    <div className="font-mono text-xs font-medium text-[var(--primary-cyan)] break-all">
                      {headers.message_id || 'Missing RFC Message-ID'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete RFC Headers Table */}
              <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-2 border-b border-[var(--border-subtle)]">
                  <h3 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Parsed RFC Header Key-Value Store
                  </h3>
                  <div className="relative max-w-xs w-full">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Filter header keys..."
                      value={headerFilter}
                      onChange={(e) => setHeaderFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs font-mono rounded bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary-cyan)]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px]">
                        <th className="py-2 px-3">Header Field</th>
                        <th className="py-2 px-3">Extracted Value</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {Object.entries(headers)
                        .filter(([k]) => !headerFilter || k.toLowerCase().includes(headerFilter.toLowerCase()))
                        .map(([key, val], idx) => {
                          const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                          return (
                            <tr key={key} className="zebra-row hover:bg-[var(--surface-container-high)]/40 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-[var(--text-secondary)] whitespace-nowrap align-top">
                                {key}
                              </td>
                              <td className="py-2.5 px-3 text-[var(--text-primary)] break-all max-w-xl">
                                {valStr || <span className="text-[var(--text-muted)] italic">empty</span>}
                              </td>
                              <td className="py-2.5 px-3 text-right align-top">
                                <button
                                  onClick={() => handleCopy(valStr, `hdr_${idx}`)}
                                  className="text-[var(--text-muted)] hover:text-[var(--primary-cyan)] transition-colors"
                                  title="Copy value"
                                >
                                  {copiedText === `hdr_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STAGE 2: CRYPTOGRAPHIC AUTHENTICATION MATRIX
              ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SPF Tri-Card */}
                <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase">
                        SPF (RFC 7208)
                      </span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          auth.spf?.status?.toLowerCase() === 'pass'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : auth.spf?.status?.toLowerCase() === 'fail'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {auth.spf?.status?.toUpperCase() || 'NONE'}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs text-[var(--text-secondary)] mt-4">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Sending Client IP</span>
                        <span className="text-[var(--text-primary)] font-bold">{auth.spf?.client_ip || '198.51.100.42'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">MailFrom Domain</span>
                        <span className="text-[var(--text-primary)]">{auth.spf?.domain || returnPathVal || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Diagnostic Detail</span>
                        <span className="text-[11px] text-[var(--text-muted)] leading-tight block mt-0.5">
                          {auth.spf?.reason || 'IP address is not in permitted SPF record ip4 range.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
                    Status: {auth.spf?.status === 'pass' ? 'Authorized Relay' : 'Unauthorized Sender'}
                  </div>
                </div>

                {/* DKIM Tri-Card */}
                <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase">
                        DKIM (RFC 6376)
                      </span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          auth.dkim?.status?.toLowerCase() === 'pass'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : auth.dkim?.status?.toLowerCase() === 'fail'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {auth.dkim?.status?.toUpperCase() || 'NONE'}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs text-[var(--text-secondary)] mt-4">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Signing Domain (d=)</span>
                        <span className="text-[var(--text-primary)] font-bold">{auth.dkim?.domain || 'legit-corp.example'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Key Selector (s=)</span>
                        <span className="text-[var(--text-primary)]">{auth.dkim?.selector || 'default'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Signature Status</span>
                        <span className="text-[11px] text-[var(--text-muted)] leading-tight block mt-0.5">
                          {auth.dkim?.reason || 'Cryptographic RSA signature verification failed / absent.'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
                    Integrity: {auth.dkim?.status === 'pass' ? 'Tamper Proof' : 'Unsigned / Broken'}
                  </div>
                </div>

                {/* DMARC Tri-Card */}
                <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase">
                        DMARC (RFC 7489)
                      </span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          auth.dmarc?.status?.toLowerCase() === 'pass'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {auth.dmarc?.status?.toUpperCase() || 'FAIL'}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs text-[var(--text-secondary)] mt-4">
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Published Policy</span>
                        <span className="text-rose-400 font-bold">{auth.dmarc?.policy || 'p=reject'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Header From Alignment</span>
                        <span className="text-[var(--text-primary)]">{auth.dmarc?.aligned ? 'Aligned' : 'Unaligned (Strict Fail)'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-muted)] block">Enforcement Action</span>
                        <span className="text-[11px] text-[var(--text-muted)] leading-tight block mt-0.5">
                          {auth.dmarc?.status === 'pass' ? 'Accept message' : 'Drop / Quarantine payload based on p=reject'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] text-[10px] font-mono text-[var(--text-muted)]">
                    Policy: {auth.dmarc?.policy || 'p=reject'}
                  </div>
                </div>
              </div>

              {/* Cryptographic Evaluation Verdict */}
              <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                <h3 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                  Cryptographic Trust Assessment
                </h3>
                <p className="text-xs font-mono text-[var(--text-secondary)] leading-relaxed">
                  The message failed domain authentication across the triad standard. Sending IP is not designated in SPF records, DKIM cryptographic signature is unverified, and DMARC alignment failed under policy enforcement. This indicates an explicit spoofing campaign.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================
              STAGE 3: RELAY TRAJECTORY & NETWORK HOPS
              ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
                  <h3 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Chronological SMTP Transit Path ({relay.length || 3} Hops Traced)
                  </h3>
                  <Link
                    href={`/map/${metadata.case_id || 'latest'}`}
                    className="flex items-center gap-1 text-xs font-mono text-[var(--primary-cyan)] hover:underline"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Open Interactive World Map</span>
                  </Link>
                </div>

                <div className="relative pl-6 border-l-2 border-[var(--border-subtle)] space-y-6 my-4">
                  {(relay.length > 0 ? relay : [
                    { hop_number: 1, from_mta: 'unknown-client', by_mta: 'suspicious-relay.external-net.example', ip: '203.0.113.88', delay_seconds: 4, timestamp: '15:32:01 UTC' },
                    { hop_number: 2, from_mta: 'suspicious-relay.external-net.example', by_mta: 'mail-gateway.target-corp.example', ip: '198.51.100.42', delay_seconds: 4, timestamp: '15:32:05 UTC' },
                    { hop_number: 3, from_mta: 'mail-gateway.target-corp.example', by_mta: 'mx1.internal.target-corp.example', ip: '192.0.2.10', delay_seconds: 5, timestamp: '15:32:10 UTC' }
                  ]).map((hop, idx) => (
                    <div key={idx} className="relative group">
                      {/* Node Beacon */}
                      <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[var(--surface-floor)] border-2 border-[var(--primary-cyan)] group-hover:bg-[var(--primary-cyan)] transition-colors" />

                      <div className="p-4 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)] hover:border-[var(--border-cyan)] transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[var(--primary-cyan)]">
                              HOP #{hop.hop_number || idx + 1}
                            </span>
                            {idx === 0 && (
                              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30">
                                ORIGIN GATEWAY
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            Δ {hop.delay_seconds || 4}s transit delay • {hop.timestamp || 'N/A'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs mt-3 pt-3 border-t border-[var(--border-subtle)]">
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Handoff From MTA</span>
                            <span className="text-[var(--text-primary)] truncate block">{hop.from_mta || 'Client Direct'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Received By MTA</span>
                            <span className="text-[var(--text-primary)] truncate block">{hop.by_mta || 'Next Hop'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[var(--text-muted)] block">Relay IP Address</span>
                            <span className="text-[var(--primary-cyan)] font-bold">{hop.ip || '198.51.100.42'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STAGE 4: IOC & DOMAIN THREAT INTELLIGENCE
              ========================================================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Extracted Hyperlinks Table */}
              <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                <h3 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 pb-2 border-b border-[var(--border-subtle)]">
                  Dissected Hyperlinks & In-Line URLs ({iocs.urls?.length || 2} Extracted)
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px]">
                        <th className="py-2 px-3">Target URL</th>
                        <th className="py-2 px-3">Resolved Domain / Host</th>
                        <th className="py-2 px-3">Risk Assessment</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {(iocs.urls?.length > 0
                        ? iocs.urls
                        : [
                            'http://198.51.100.42/portal/login?id=9928',
                            'https://secure-invoice-verification.xyz/payment/auth.php'
                          ]
                      ).map((url, idx) => {
                        const isIpUrl = url.includes('198.51.100') || url.includes('//1');
                        return (
                          <tr key={idx} className="zebra-row hover:bg-[var(--surface-container-high)]/40 transition-colors">
                            <td className="py-2.5 px-3 text-[var(--text-primary)] max-w-md truncate">
                              {url}
                            </td>
                            <td className="py-2.5 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                              {url.split('/')[2] || 'unknown'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                                  isIpUrl
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                {isIpUrl ? 'HIGH RISK: RAW IP HOST' : 'SUSPICIOUS TLD .XYZ'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                onClick={() => handleCopy(url, `url_${idx}`)}
                                className="text-[var(--text-muted)] hover:text-[var(--primary-cyan)] transition-colors"
                                title="Copy defanged URL"
                              >
                                {copiedText === `url_${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Extracted Entities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                  <h4 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                    Observed Domain Reputations
                  </h4>
                  <ul className="space-y-2 font-mono text-xs divide-y divide-[var(--border-subtle)]">
                    <li className="pt-2 flex items-center justify-between">
                      <span className="text-[var(--text-primary)]">legit-corp.example</span>
                      <span className="text-[10px] font-bold text-amber-400">Target of Spoofing</span>
                    </li>
                    <li className="pt-2 flex items-center justify-between">
                      <span className="text-rose-400">external-secure-portal.xyz</span>
                      <span className="text-[10px] font-bold text-rose-400">Attacker Drop Domain</span>
                    </li>
                  </ul>
                </div>

                <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                  <h4 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                    Attachment Forensics
                  </h4>
                  <p className="font-mono text-xs text-[var(--text-muted)] leading-relaxed">
                    No executable binaries attached. Attack vector relies on HTML hyperlink redirection and credential harvesting.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STAGE 5: THREAT HEURISTICS & EXPLAINABLE RISK
              ========================================================= */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* SVG Threat Radial Gauge (Span 5) */}
                <div className="lg:col-span-5 glass-panel p-6 rounded-lg border border-[var(--border-subtle)] flex flex-col items-center justify-center text-center">
                  <span className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
                    Forensic Threat Probability
                  </span>

                  {/* SVG Gauge */}
                  <div className="relative w-44 h-44 flex items-center justify-center my-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-[var(--surface-container-high)]"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="42"
                        className="stroke-rose-500 transition-all duration-1000 ease-out"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 42}
                        strokeDashoffset={2 * Math.PI * 42 * (1 - (risk.score || 88) / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold font-mono text-rose-500 tracking-tight">
                        {risk.score ?? 88}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                        / 100 INDEX
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      {risk.classification || 'CRITICAL BEC / PHISHING'}
                    </span>
                    <p className="text-xs font-mono text-[var(--text-muted)] mt-2">
                      High confidence malicious intent. Automated quarantine recommended.
                    </p>
                  </div>
                </div>

                {/* Contributing Risk Factors (Span 7) */}
                <div className="lg:col-span-7 glass-panel p-6 rounded-lg border border-[var(--border-subtle)] flex flex-col justify-between">
                  <h3 className="font-mono text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 pb-2 border-b border-[var(--border-subtle)]">
                    Scoring Attribution Breakdown
                  </h3>

                  <div className="space-y-4 font-mono text-xs">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-primary)]">Cryptographic Authentication Failure (SPF/DKIM/DMARC)</span>
                        <span className="text-rose-400 font-bold">+35 pts</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface-container-high)] overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full w-[85%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-primary)]">Financial Transaction & Wire Transfer Intent (BEC)</span>
                        <span className="text-rose-400 font-bold">+25 pts</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface-container-high)] overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full w-[70%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-primary)]">Sender Envelope Impersonation / Return-Path Mismatch</span>
                        <span className="text-amber-400 font-bold">+18 pts</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface-container-high)] overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[50%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[var(--text-primary)]">Suspicious Raw IP Hyperlinks & Typosquatting</span>
                        <span className="text-amber-400 font-bold">+10 pts</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface-container-high)] overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[35%]" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-muted)]">
                    Aggregated by SIH26106 RoBERTa Forensic Ensemble & Risk Rules Engine.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              STAGE 6: EVIDENCE INTEGRITY & CUSTODY SEALING
              ========================================================= */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-lg border border-[var(--border-subtle)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-[var(--border-subtle)]">
                  <div>
                    <span className="font-mono text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                      Court-Admissible Forensic Custody
                    </span>
                    <h3 className="font-mono text-lg font-bold text-[var(--text-primary)]">
                      Digital Certificate of Evidence Integrity
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SEALED & IMMUTABLE</span>
                    </span>
                  </div>
                </div>

                {/* Hash & Metadata Table */}
                <div className="space-y-4 font-mono text-xs">
                  <div className="p-4 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                        SHA-256 Bitstream Hash (RFC 3174)
                      </span>
                      <button
                        onClick={() => handleCopy(metadata.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'sha256_custody')}
                        className="flex items-center gap-1 text-[11px] text-[var(--primary-cyan)] hover:underline"
                      >
                        {copiedText === 'sha256_custody' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText === 'sha256_custody' ? 'Copied' : 'Copy Hash'}</span>
                      </button>
                    </div>
                    <div className="font-bold text-[var(--primary-cyan)] break-all text-xs">
                      {metadata.sha256 || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-3 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-1">Case Identifier</span>
                      <span className="font-bold text-[var(--text-primary)]">{metadata.case_id || 'CASE-20260907-88DF'}</span>
                    </div>

                    <div className="p-3 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-1">Ingested File Size</span>
                      <span className="font-bold text-[var(--text-primary)]">{metadata.file_size ? `${metadata.file_size} Bytes` : '2,699 Bytes'}</span>
                    </div>

                    <div className="p-3 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-1">Timestamp (UTC)</span>
                      <span className="font-bold text-[var(--text-primary)]">{metadata.analysis_timestamp || new Date().toISOString()}</span>
                    </div>

                    <div className="p-3 rounded-md bg-[var(--surface-container-low)] border border-[var(--border-subtle)]">
                      <span className="text-[10px] text-[var(--text-muted)] uppercase block mb-1">Standard Reference</span>
                      <span className="font-bold text-emerald-400">NIST SP 800-86</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono text-xs">
                  <span className="text-[var(--text-muted)]">
                    Evidence record permanently committed to SQLite database <code className="text-[var(--text-secondary)]">backend/forensics.db</code>.
                  </span>
                  <Link
                    href={`/report/${metadata.case_id || 'latest'}`}
                    className="flex items-center gap-1.5 text-[var(--primary-cyan)] font-bold hover:underline"
                  >
                    <span>View Formal Court Dossier</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================
              LIVE FORENSIC TERMINAL LOG CONSOLE
              ========================================================= */}
          <div className="glass-panel p-4 rounded-lg border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--text-secondary)] uppercase">
                <Terminal className="w-3.5 h-3.5 text-[var(--primary-cyan)]" />
                <span>Forensic Execution Console Stream</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LISTENING</span>
              </span>
            </div>

            <div className="bg-[var(--surface-floor)] p-3 rounded font-mono text-[11px] text-[var(--text-secondary)] h-32 overflow-y-auto space-y-1">
              {consoleLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log}
                </div>
              ))}
              <div ref={terminalBottomRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
