import { Link } from 'react-router-dom';
import { Mail, Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-white">
      <div className="container mx-auto px-5 pt-10 pb-6">
        {/* Top */}
        <div className="border-b border-white/[0.08] pb-6 mb-6">
          <span className="text-xl font-extrabold">Trade<span className="text-primary">Circle</span></span>
          <p className="mt-1 max-w-[260px] text-[13px] leading-relaxed text-white/50">
            India's only marketplace for SEBI-verified trading advisors.
          </p>
        </div>

        {/* Links */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 mb-6">
          <div>
            <span className="mb-3 block text-[11px] font-bold uppercase tracking-[2px] text-white/30">Platform</span>
            {[
              { to: '/discover', label: 'Browse Advisors' },
              { to: '/advisor-register', label: 'Register as Advisor' },
              { to: '/login', label: 'Sign In / Sign Up' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="mb-2.5 block text-[13px] text-white/60 hover:text-white transition-colors">{l.label}</Link>
            ))}
          </div>
          <div>
            <span className="mb-3 block text-[11px] font-bold uppercase tracking-[2px] text-white/30">Legal</span>
            {[
              { to: '/privacy', label: 'Privacy Policy' },
              { to: '/terms', label: 'Terms of Service' },
              { to: '/refund', label: 'Refund Policy' },
              { to: '/disclaimer', label: 'Disclaimer' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="mb-2.5 block text-[13px] text-white/60 hover:text-white transition-colors">{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mb-5 flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
          <Mail className="h-4 w-4 text-white/50 shrink-0" />
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-[1.5px] text-white/30">Support & Grievances</span>
            <a href="mailto:trade11.service@gmail.com" className="text-[13px] text-white/70 hover:text-white transition-colors">trade11.service@gmail.com</a>
          </div>
        </div>

        {/* Company */}
        <div className="border-t border-white/[0.08] pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/40">STREZONIC PRIVATE LIMITED</p>
          <p className="mt-1 text-[10px] leading-[1.7] text-white/25">
            CIN: U62099MH2025PTC453360 · PAN: ABQCS8594P<br />
            Registered: Virar, Vasai, Thane-401303, Maharashtra
          </p>
        </div>

        {/* SEBI disclaimer */}
        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3">
          <p className="text-[10px] leading-relaxed text-white/20">
            <Shield className="inline h-3 w-3 text-white/30 mr-1" />
            TradeCircle is a technology marketplace platform operated by STREZONIC PRIVATE LIMITED (CIN: U62099MH2025PTC453360). We are not a SEBI registered investment advisor. All advisors listed are independently SEBI registered and solely responsible for their recommendations. Investment in securities is subject to market risks. Past performance does not guarantee future results. For grievances: grievance@tradecircle.in · SCORES: scores.gov.in
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] text-white/20">
          <span>© 2026 TradeCircle</span>
          <span>Built for Indian Traders</span>
        </div>
      </div>
    </footer>
  );
}
