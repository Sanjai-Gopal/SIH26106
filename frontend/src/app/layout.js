import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import InteractiveBackground from '@/components/common/InteractiveBackground';
import { ThemeProvider } from '@/context/ThemeContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'ThreatLens — AI & Blockchain Forensic Intelligence',
  description: 'Military-grade email threat detection, GeoLocation relay mapping, transformer AI/ML phishing analysis, and cryptographic blockchain chain-of-custody verification.',
  keywords: ['email forensics', 'threat intelligence', 'phishing detection', 'blockchain custody', 'cybersecurity', 'SIH2026'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-300">
        <ThemeProvider>
          {/* Interactive Dynamic Background with Animated Constellation Canvas */}
          <InteractiveBackground />

          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 pt-16">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
