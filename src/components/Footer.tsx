import { Link } from 'react-router-dom';
import { Mail, Shield, ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[hsl(224,32%,6%)] text-white overflow-hidden">
      {/* Top gradient line */}
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container relative mx-auto px-5 py-10">
        {/* Top section: Brand + Links */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                S
              </div>
              <span className="text-lg font-extrabold tracking-tight">
                Stock<span className="text-primary">Circle</span>
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              India's first SEBI-only advisory marketplace. Verified advisors. Tamper-proof records. Real trust.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/30 mb-3">Platform</h3>
            <nav className="space-y-2">
              {[
                { to: '/discover', label: 'Browse Advisors' },
                { to: '/explore', label: 'Public Feed' },
                { to: '/advisor-register', label: 'Register as Advisor' },
                { to: '/login', label: 'Sign In' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="block text-[13px] text-white/50 hover:text-primary transition-colors">{l.label}</Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/30 mb-3">Legal</h3>
            <nav className="space-y-2">
              {[
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms', label: 'Terms of Service' },
                { to: '/refund', label: 'Refund Policy' },
                { to: '/disclaimer', label: 'Disclaimer' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="block text-[13px] text-white/50 hover:text-primary transition-colors">{l.label}</Link>
              ))}
            </nav>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/30 mb-3">Support</h3>
            <nav className="space-y-2">
              <a href="mailto:support@StockCircle.in" className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-primary transition-colors">
                <Mail className="h-3.5 w-3.5" /> support@StockCircle.in
              </a>
              <a href="https://scores.gov.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-primary transition-colors">
                SEBI SCORES <ExternalLink className="h-3 w-3" />
              </a>
            </nav>
          </div>
        </div>

        {/* SEBI Compliance */}
        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 mb-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] leading-relaxed text-white/50">
                StockCircle is operated by <strong className="text-white/70">STREZONIC PRIVATE LIMITED</strong> (CIN: U62099MH2025PTC453360). 
                We are <strong className="text-white/70">not a SEBI-registered investment advisor</strong>. All advisors listed are independently 
                SEBI-registered Research Analysts (INH holders). Investment in securities carries market risk. Past performance ≠ future results.
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/35 mt-2">
                <span>📧 <a href="mailto:grievance@StockCircle.in" className="text-primary hover:underline">grievance@StockCircle.in</a></span>
                <span>📋 <a href="https://scores.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SEBI SCORES</a></span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-white/8 pt-5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-white">
              Stock<span className="text-primary">Circle</span>
            </span>
            <span className="text-white/20">·</span>
            <span className="text-[11px] text-white/30">© {currentYear} STREZONIC PVT LTD</span>
          </div>
          <span className="text-[11px] text-white/30">Built for Indian Traders 🇮🇳</span>
        </div>
      </div>
    </footer>
  );
}
