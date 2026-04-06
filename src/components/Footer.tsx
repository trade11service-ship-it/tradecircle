import { Link } from 'react-router-dom';
import { Mail, Shield, ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-white">
      <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="container mx-auto px-5 py-8">
        {/* Grid: 4 columns on md, stacked on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {/* Platform */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">Platform</h3>
            <nav className="space-y-1.5">
              {[
                { to: '/discover', label: 'Browse Advisors' },
                { to: '/advisor-register', label: 'Register as Advisor' },
                { to: '/login', label: 'Sign In' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="block text-[13px] text-white/60 hover:text-primary transition-colors">{l.label}</Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">Legal</h3>
            <nav className="space-y-1.5">
              {[
                { to: '/privacy', label: 'Privacy' },
                { to: '/terms', label: 'Terms' },
                { to: '/refund', label: 'Refund' },
                { to: '/disclaimer', label: 'Disclaimer' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="block text-[13px] text-white/60 hover:text-primary transition-colors">{l.label}</Link>
              ))}
            </nav>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">Support</h3>
            <nav className="space-y-1.5">
              <a href="mailto:support@tradecircle.in" className="block text-[13px] text-white/60 hover:text-primary transition-colors">Email Support</a>
              <a href="https://scores.gov.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] text-white/60 hover:text-primary transition-colors">
                SEBI SCORES <ExternalLink className="h-3 w-3" />
              </a>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">Contact</h3>
            <a href="mailto:support@tradecircle.in" className="inline-flex items-center gap-1.5 text-[13px] text-white/60 hover:text-primary transition-colors">
              <Mail className="h-3.5 w-3.5" /> support@tradecircle.in
            </a>
          </div>
        </div>

        {/* SEBI Compliance — compact */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
          <div className="flex gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-white/60">
              TradeCircle is operated by <strong className="text-white/80">STREZONIC PRIVATE LIMITED</strong> (CIN: U62099MH2025PTC453360). We are <strong className="text-white/80">not a SEBI-registered investment advisor</strong>. All advisors listed are independently SEBI-registered. Investment in securities carries risk. Past performance ≠ future results.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40 mt-2 ml-6">
            <span>📧 <a href="mailto:grievance@tradecircle.in" className="text-primary hover:underline">grievance@tradecircle.in</a></span>
            <span>📋 <a href="https://scores.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SEBI SCORES</a></span>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-white">Trade<span className="text-primary">Circle</span></span>
            <span className="text-white/30">·</span>
            <span className="text-[11px] text-white/40">© {currentYear}</span>
          </div>
          <span className="text-[11px] text-white/40">Made for Indian Traders 🇮🇳</span>
        </div>
      </div>
    </footer>
  );
}
