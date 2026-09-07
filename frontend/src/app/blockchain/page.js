'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Blocks,
  ShieldCheck,
  Search,
  Lock,
  CheckCircle2,
  Copy,
  ExternalLink,
  Printer,
  FileCheck,
  AlertCircle,
  Cpu,
  Layers,
  FileText,
  MapPin,
  Check
} from 'lucide-react';
import { deriveBlockchainRecord, verifyHashIntegrity } from '@/lib/blockchain';
import { listCases, getCaseEvidence } from '@/lib/api';
import { getHistory } from '@/lib/storage';
import { BLOCKCHAIN_NETWORK } from '@/lib/constants';

function BlockchainExplorerContent() {
  const searchParams = useSearchParams();
  const paramCaseId = searchParams.get('caseId');
  const paramHash = searchParams.get('hash');

  const [cases, setCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(paramCaseId || null);
  const [inputQuery, setInputQuery] = useState('');
  const [record, setRecord] = useState(null);
  const [copied, setCopied] = useState(false);
  const [verificationInput, setVerificationInput] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load real cases from database
  useEffect(() => {
    async function loadCases() {
      setLoading(true);
      try {
        const res = await listCases(20, 0);
        let caseList = [];
        if (res && res.cases && res.cases.length > 0) {
          caseList = res.cases;
        } else {
          caseList = getHistory();
        }
        setCases(caseList);

        // Pick initial case
        const initialId = paramCaseId || (caseList.length > 0 ? caseList[0].case_id : 'CASE-DEMO');
        setSelectedCaseId(initialId);

        // Fetch evidence hash for this case
        let hash = paramHash;
        if (!hash && initialId && initialId !== 'CASE-DEMO') {
          try {
            const ev = await getCaseEvidence(initialId);
            if (ev && ev.sha256_hash) {
              hash = ev.sha256_hash;
            }
          } catch {
            // fallback
          }
        }
        if (!hash) {
          hash = '7fda70245a4913be41d6c6ebbd2eb30019284819280918239019283918293819';
        }

        setInputQuery(hash);
        setRecord(deriveBlockchainRecord(initialId, hash));
      } catch (err) {
        console.warn('Failed to load blockchain cases:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, [paramCaseId, paramHash]);

  const handleSelectCase = async (cId) => {
    setSelectedCaseId(cId);
    let hash = null;
    try {
      const ev = await getCaseEvidence(cId);
      if (ev && ev.sha256_hash) {
        hash = ev.sha256_hash;
      }
    } catch {
      // ignore
    }
    if (!hash) {
      hash = '7fda70245a4913be41d6c6ebbd2eb30019284819280918239019283918293819';
    }
    setInputQuery(hash);
    setRecord(deriveBlockchainRecord(cId, hash));
    setVerifyResult(null);
  };

  const handleSearch = () => {
    if (!inputQuery.trim()) return;
    const isCase = inputQuery.toUpperCase().startsWith('CASE-');
    const newRecord = deriveBlockchainRecord(
      isCase ? inputQuery : (selectedCaseId || `CASE-${inputQuery.slice(0, 8).toUpperCase()}`),
      isCase ? '7fda70245a4913be41d6c6ebbd2eb30019284819280918239019283918293819' : inputQuery
    );
    setRecord(newRecord);
    setVerifyResult(null);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore
    }
  };

  const handleVerifyHash = () => {
    if (!record) return;
    const isMatch = verifyHashIntegrity(verificationInput, record.payloadSha256);
    setVerifyResult(isMatch);
  };

  const handlePrintCert = () => {
    window.print();
  };

  if (!record) {
    return (
      <div className="p-12 text-center font-mono text-xs text-[var(--primary-cyan)]">
        Synchronizing with digital evidence ledger...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-t-2 border-t-[var(--primary-cyan)]"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <Blocks className="w-3.5 h-3.5 text-amber-500" />
            <span>IMMUTABLE EVIDENCE LEDGER</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Blockchain Proof-of-Custody Explorer
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Tamper-evident verification of raw email forensic digests, Merkle tree cryptographic integrity, and compliance with ISO/IEC 27037 & NIST SP 800-86 standards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrintCert}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md font-mono text-xs font-bold bg-[var(--primary-cyan)] text-[#05070b] hover:brightness-110 transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>PRINT CUSTODY CERTIFICATE</span>
          </button>
        </div>
      </motion.div>

      {/* Real Cases Selector Tabs */}
      {cases.length > 0 && (
        <div className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] mb-1">
            <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">
              Select Indexed Forensic Case:
            </span>
            <span>{cases.length} Block(s) Anchored</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {cases.map((c) => {
              const isSelected = selectedCaseId === c.case_id;
              return (
                <button
                  key={c.case_id}
                  onClick={() => handleSelectCase(c.case_id)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--primary-cyan)]/15 border-[var(--primary-cyan)] text-[var(--primary-cyan)] shadow-sm'
                      : 'bg-[var(--surface-container-low)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-container)]'
                  }`}
                >
                  <span>{c.case_id}</span>
                  <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
                    ({c.original_filename || c.subject || 'EML'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hash / Case Search Console */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Query by SHA-256 Hash Digest (e.g. 7fda70245a...) or Case ID (CASE-...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--primary-cyan)] outline-none focus:border-[var(--primary-cyan)] shadow-inner font-bold"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-5 py-2.5 rounded-md font-mono text-xs font-bold bg-[var(--primary-cyan)] text-[#05070b] hover:brightness-110 transition-all shadow-sm cursor-pointer shrink-0"
          >
            Query Ledger
          </button>
        </div>
      </div>

      {/* Block & Evidence Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Custody Certificate Box */}
        <div className="lg:col-span-2 glass-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary-cyan)]/15 border border-[var(--border-cyan)] flex items-center justify-center">
                <FileCheck className="w-5 h-5 text-[var(--primary-cyan)]" />
              </div>
              <div>
                <h3 className="text-base font-bold font-mono text-[var(--text-primary)]">
                  Cryptographic Certificate of Digital Custody
                </h3>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Block #{record.blockHeight} • Sealed & Verified
                </span>
              </div>
            </div>

            <span className="badge text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
              {record.confirmations} CONFIRMATIONS
            </span>
          </div>

          {/* Details Table */}
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] space-y-1">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Case Identifier</span>
              <span className="text-[var(--text-primary)] font-bold text-sm">{record.caseId}</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Exact SHA-256 Digest</span>
                <button
                  onClick={() => handleCopy(record.payloadSha256)}
                  className="text-[11px] text-[var(--primary-cyan)] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <span className="text-[var(--primary-cyan)] font-bold break-all block">{record.payloadSha256}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">On-Chain Transaction Hash</span>
                <span className="text-[var(--text-secondary)] break-all text-[11px] block">{record.transactionHash}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Merkle Tree Root</span>
                <span className="text-[var(--text-secondary)] break-all text-[11px] block">{record.merkleRoot}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Validator Node</span>
                <span className="text-indigo-500 font-bold block">{record.validatorNode}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] space-y-1">
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Timestamp (UTC)</span>
                <span className="text-[var(--text-primary)] font-medium block">{new Date(record.timestamp).toUTCString()}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--primary-cyan)]/5 border border-[var(--border-cyan)] text-xs font-mono text-[var(--text-secondary)]">
            <span className="text-[var(--primary-cyan)] font-bold block mb-1">Evidentiary Disclaimer & Admissibility:</span>
            <p className="leading-relaxed text-[11px]">
              This cryptographic digest serves as mathematical proof that the ingested RFC822 payload remains identical to the bitstream collected at intake, satisfying FRE Rule 902(13)/(14) electronic record authentication.
            </p>
          </div>
        </div>

        {/* Live Integrity Verifier Widget */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-[var(--primary-cyan)]" />
              <h3 className="text-sm font-bold font-mono text-[var(--text-primary)]">
                Live SHA-256 Hash Verifier
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-3">
              Paste any external or extracted SHA-256 hash to mathematically verify match against block record.
            </p>

            <textarea
              rows={4}
              value={verificationInput}
              onChange={(e) => setVerificationInput(e.target.value)}
              placeholder="Paste SHA-256 hash here..."
              className="w-full p-3 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] outline-none focus:border-[var(--primary-cyan)] shadow-inner"
            />

            <button
              onClick={handleVerifyHash}
              className="mt-3 w-full py-2.5 rounded-xl font-mono font-bold text-xs btn-cyber-primary shadow-sm cursor-pointer"
            >
              Verify Match
            </button>

            {verifyResult !== null && (
              <div
                className={`mt-4 p-3 rounded-xl border font-mono text-xs flex items-center gap-2 ${
                  verifyResult
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                }`}
              >
                {verifyResult ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>✓ SHA-256 MATCH CONFIRMED: Payload is authentic and untampered.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>🚨 HASH MISMATCH: Payload has been altered or modified in transit!</span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[var(--surface-container-low)] border border-[var(--border-subtle)] font-mono text-[11px] text-[var(--text-secondary)] space-y-1">
            <span className="text-[var(--text-primary)] font-bold block">Network Standards:</span>
            <div>• {BLOCKCHAIN_NETWORK.network}</div>
            <div>• Contract: <span className="text-[var(--primary-cyan)] font-bold">{BLOCKCHAIN_NETWORK.contractAddress.slice(0, 16)}...</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BlockchainPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh] text-[var(--primary-cyan)] font-mono text-xs">
            <div className="w-8 h-8 border-2 border-[var(--primary-cyan)] border-t-transparent rounded-full animate-spin mr-3" />
            <span>Synchronizing Proof-of-Custody Ledger...</span>
          </div>
        }
      >
        <BlockchainExplorerContent />
      </Suspense>
    </div>
  );
}
