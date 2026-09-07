'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Shield,
  LayoutDashboard,
  Upload,
  FolderArchive,
  BrainCircuit,
  Blocks,
  Map,
  Activity,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { checkHealth } from '@/lib/api';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { href: '/', label: 'Command Center', icon: LayoutDashboard },
  { href: '/analyze', label: 'Analyze EML', icon: Upload },
  { href: '/cases', label: 'Case Vault', icon: FolderArchive },
  { href: '/ml-intelligence', label: 'AI/ML Studio', icon: BrainCircuit, badge: 'AI' },
  { href: '/blockchain', label: 'Ledger Custody', icon: Blocks, badge: 'CHAIN' },
  { href: '/map', label: 'Geo-Relay', icon: Map },
  { href: '/status', label: 'Node Telemetry', icon: Activity },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking');
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let active = true;
    const verifyNodes = async () => {
      try {
        const res = await checkHealth();
        if (active) {
          setApiStatus(res.status === 'online' ? 'online' : 'offline');
        }
      } catch {
        if (active) setApiStatus('offline');
      }
    };

    verifyNodes();
    const timer = setInterval(verifyNodes, 12000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const isDark = theme === 'dark';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--glass-bg)] backdrop-blur-2xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo with Cyber Beacon */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="relative">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 via-blue-600 to-indigo-600 p-[1.5px] shadow-[0_0_15px_var(--primary-cyan-glow)] transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-[var(--surface-base)] rounded-[7px] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[var(--primary-cyan)]" />
                </div>
              </div>
              <span
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[var(--surface-base)] ${
                  apiStatus === 'online'
                    ? 'bg-emerald-400 shadow-[0_0_8px_#00e676]'
                    : apiStatus === 'offline'
                    ? 'bg-rose-500 shadow-[0_0_8px_#ff1744]'
                    : 'bg-amber-400 animate-ping'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[var(--text-primary)] font-mono">
                  Threat<span className="text-[var(--primary-cyan)]">Lens</span>
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--primary-cyan)]/10 text-[var(--primary-cyan)] border border-[var(--border-cyan)]">
                  {isDark ? 'OBSIDIAN' : 'CLINICAL LAB'}
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider block text-[var(--text-muted)] uppercase">
                Forensic Custody • SIH26106
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon, badge }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all duration-200 ${
                    isActive
                      ? 'text-[var(--primary-cyan)] bg-[var(--primary-cyan)]/15 font-bold border border-[var(--border-cyan)] shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-container-high)] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-[var(--primary-cyan)]' : 'text-[var(--text-muted)]'
                    }`}
                  />
                  <span>{label}</span>
                  {badge && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-500 font-bold border border-indigo-500/30">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right Action Bar: Theme Switcher & Node Pill */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {/* Fluid Light / Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border border-[var(--border-subtle)] bg-[var(--surface-container-low)] hover:border-[var(--border-cyan)] transition-all shadow-sm group cursor-pointer"
              title={`Switch to ${isDark ? 'Clinical Light Mode' : 'Obsidian Dark Mode'}`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform" />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Light Lab</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500 group-hover:-rotate-12 transition-transform" />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">Dark Void</span>
                </>
              )}
            </button>

            {/* Live Backend Telemetry Pill */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-container-low)] text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiStatus === 'online'
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                    : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                }`}
              />
              <span className="text-[11px] font-bold text-[var(--text-primary)]">
                {apiStatus === 'online' ? 'API :8000' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)]"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)]"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-4 py-4 space-y-2 shadow-2xl">
          {navItems.map(({ href, label, icon: Icon, badge }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-mono font-bold ${
                  isActive
                    ? 'text-[var(--primary-cyan)] bg-[var(--primary-cyan)]/15 border border-[var(--border-cyan)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-500/15 text-indigo-500 font-bold">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
