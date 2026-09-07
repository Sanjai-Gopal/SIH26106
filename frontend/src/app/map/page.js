'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Route, MapPin, Upload, FileSearch, ArrowRight } from 'lucide-react';
import { listCases } from '@/lib/api';
import { getHistory } from '@/lib/storage';

const RelayMapInner = dynamic(() => import('@/components/map/RelayMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-cyan-400 font-mono text-xs">
      <span>Loading Threat Infrastructure Map...</span>
    </div>
  ),
});

const DEFAULT_GLOBAL_HOPS = [
  { hop_number: 1, ip: '185.220.101.45', ip_type: 'public', sending_server: 'mail-relay.attacker-vps.ru', receiving_server: 'mx-eu.target.com', lat: 55.7558, lng: 37.6173, delay_seconds: 0.4 },
  { hop_number: 2, ip: '198.51.100.77', ip_type: 'public', sending_server: 'mx-eu.target.com', receiving_server: 'relay-ashburn.target.com', lat: 50.1109, lng: 8.6821, delay_seconds: 1.2 },
  { hop_number: 3, ip: '198.51.100.12', ip_type: 'public', sending_server: 'relay-ashburn.target.com', receiving_server: 'internal-exchange.target.com', lat: 39.0438, lng: -77.4874, delay_seconds: 0.8 },
  { hop_number: 4, ip: '10.0.4.12', ip_type: 'rfc1918', is_private_ip: true, sending_server: 'internal-exchange.target.com', receiving_server: 'user-mailbox.corp.internal', lat: 37.7749, lng: -122.4194, delay_seconds: 0.1 },
];

export default function GlobalMapPage() {
  const [cases, setCases] = useState([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await listCases(10, 0);
        if (res && res.cases) {
          setCases(res.cases);
        } else {
          setCases(getHistory());
        }
      } catch {
        setCases(getHistory());
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-cyan-400" />
            </div>
            <h1 className="text-2xl font-bold font-mono text-white">
              Global Threat Infrastructure & Relay Tracer
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Global geographic visualization of email hop-to-hop routing telemetry and ISP network nodes.
          </p>
        </div>

        <Link
          href="/analyze"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold text-[#0A0C10] bg-cyan-400 hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(0,229,255,0.3)] self-start sm:self-auto"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Ingest New Message</span>
        </Link>
      </div>

      {/* Map Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh] min-h-[500px]">
        <div className="lg:col-span-2 glass-card overflow-hidden border border-cyan-500/30 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
          <RelayMapInner relayPath={DEFAULT_GLOBAL_HOPS} />
        </div>

        {/* Recent Cases to Trace */}
        <div className="glass-card p-5 overflow-y-auto space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Route className="w-4 h-4 text-cyan-400" />
              <span>Select Case to Map</span>
            </span>
            <span className="text-[10px] text-slate-400">{cases.length} Available</span>
          </div>

          {cases.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p>No cases ingested yet.</p>
              <Link href="/analyze" className="text-cyan-400 hover:underline text-xs mt-2 block">
                Analyze an EML file
              </Link>
            </div>
          ) : (
            cases.map((c, idx) => (
              <Link
                key={idx}
                href={`/map/${encodeURIComponent(c.case_id)}`}
                className="block p-3 rounded-lg bg-[#0A0C10] border border-white/[0.06] hover:border-cyan-500/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 group-hover:text-cyan-200">
                    {c.case_id}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-white text-xs font-semibold truncate mt-1">
                  {c.original_filename || c.subject || 'Case Payload'}
                </p>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Score: {c.risk_score || c.score || 0} • Click to plot trajectory
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
