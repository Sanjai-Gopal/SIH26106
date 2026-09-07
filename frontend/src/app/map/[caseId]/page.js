'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Route, Clock, Server, Globe, ShieldAlert, FileText } from 'lucide-react';
import { getAnalysis } from '@/lib/storage';
import { getCaseDetail } from '@/lib/api';

const RelayMapInner = dynamic(() => import('@/components/map/RelayMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-cyan-400 font-mono text-xs">
      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3" />
      <span>Loading Cyber Infrastructure Map...</span>
    </div>
  ),
});

export default function CaseMapPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const rawCaseId = params?.caseId;
    if (!rawCaseId) return;
    const caseId = decodeURIComponent(rawCaseId);

    async function loadCase() {
      setLoading(true);
      try {
        const res = await getCaseDetail(caseId);
        if (res && res.analysis) {
          setData(res.analysis);
        } else {
          const local = getAnalysis(caseId);
          if (local) {
            setData(local);
          } else {
            setNotFound(true);
          }
        }
      } catch {
        const local = getAnalysis(caseId);
        if (local) setData(local);
        else setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadCase();
  }, [params.caseId]);

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="glass-card p-8 max-w-md text-center">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-rose-400" />
          <h2 className="text-lg font-bold text-white font-mono mb-2">Relay Map Unavailable</h2>
          <p className="text-xs text-slate-400 font-mono mb-6">
            Case <code className="text-cyan-300 font-bold">{params?.caseId}</code> was not found.
          </p>
          <Link
            href="/cases"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[#0A0C10] bg-cyan-400"
          >
            Go to Case Vault
          </Link>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-cyan-400 font-mono text-sm">
        <span>Initializing Flight Path Matrix...</span>
      </div>
    );
  }

  const hops = data.relay_path || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dossier
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black font-mono text-white">
              Geo-Relay Flight Path: {data.case_id}
            </h1>
            <span className="badge text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              {hops.length} HOPS PLOTTED
            </span>
          </div>
        </div>

        <Link
          href={`/report/${encodeURIComponent(data.case_id)}`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-semibold text-[#0A0C10] bg-cyan-400 hover:bg-cyan-300 transition-all self-start sm:self-auto shadow-[0_0_15px_rgba(0,229,255,0.3)]"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>View Full Report</span>
        </Link>
      </div>

      {/* Map + Side Hop Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[72vh] min-h-[500px]">
        {/* Fullscreen Map Canvas */}
        <div className="lg:col-span-2 glass-card overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <RelayMapInner relayPath={hops} />
        </div>

        {/* Sidebar Flight Hop Breakdown */}
        <div className="glass-card p-5 overflow-y-auto space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Route className="w-4 h-4 text-cyan-400" />
              <span>Hop-by-Hop Breakdown</span>
            </span>
            <span className="text-[11px] text-slate-400">{hops.length} Total</span>
          </div>

          {hops.map((hop, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg bg-[#0A0C10] border border-white/[0.06] hover:border-cyan-500/40 transition-all space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300">
                  Hop #{hop.hop_number || idx + 1}
                </span>
                <span className="text-[10px] text-slate-400">
                  {hop.ip_type || (hop.is_private_ip ? 'RFC1918' : 'Public')}
                </span>
              </div>

              {hop.ip && (
                <div className="text-[11px]">
                  <span className="text-slate-500">IP:</span>{' '}
                  <span className="text-white font-semibold">{hop.ip}</span>
                </div>
              )}

              {hop.sending_server && (
                <div className="text-[10px] text-slate-400 truncate">
                  From: {hop.sending_server}
                </div>
              )}

              {hop.receiving_server && (
                <div className="text-[10px] text-slate-400 truncate">
                  By: {hop.receiving_server}
                </div>
              )}

              {hop.delay_seconds !== null && hop.delay_seconds !== undefined && (
                <div className="text-[10px] text-amber-400 font-semibold pt-0.5">
                  Δ {hop.delay_seconds}s transit latency
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
