import { Link } from 'react-router-dom';
import { Mail, Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-foreground text-white">
      <div className="container mx-auto px-5 pt-12 pb-6">
        {/* Top section */}
        <div className="border-b border-white/[0.08] pb-8 mb-8">
          <span className="text-2xl font-extrabold">
            Trade<span className="text-[#69F0AE]">Circle</span>
          </span>
          <p className="mt-1.5 max-w-[240px] text-[13px] leading-relaxed text-white/55">
            India's only marketplace for SEBI-verified trading advisors.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['🛡 SEBI Verified Platform', '🔒 Razorpay Secured', '🇮🇳 Made in India'].map(t => (
              <span key={t} className="rounded-lg border border-white/[0.12] bg-white/[0.06] px-3 py-1.5 text-[10px] text-white/70">{t}</span>
            ))}
          </div>
        </div>

        {/* Links grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 mb-8">
          <div>
            <span className="mb-3.5 block text-[11px] font-bold uppercase tracking-[2px] text-white/35">Platform</span>
            {[
              { to: '/#advisors', label: 'Browse Advisors' },
              { to: '/advisor-register', label: 'Register as Advisor' },
              { to: '/#how-it-works', label: 'How It Works' },
              { to: '/login', label: 'Sign In / Sign Up' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="mb-3 block text-[13px] font-medium text-white/70 transition-all duration-150 hover:pl-1 hover:text-white">{l.label}</Link>
            ))}
          </div>
          <div>
            <span className="mb-3.5 block text-[11px] font-bold uppercase tracking-[2px] text-white/35">Legal</span>
            {[
              { to: '/privacy', label: 'Privacy Policy' },
              { to: '/terms', label: 'Terms of Service' },
              { to: '/refund', label: 'Refund Policy' },
              { to: '/disclaimer', label: 'Disclaimer' },
            ].map(l => (
              <Link key={l.to} to={l.to} className="mb-3 block text-[13px] font-medium text-white/70 transition-all duration-150 hover:pl-1 hover:text-white">{l.label}</Link>
            ))}
          </div>
        </div>

        {/* Contact row */}
        <div className="mb-7 flex items-center gap-3 rounded-[10px] border border-white/[0.08] bg-white/[0.04] p-3.5">
          <div className="flex h-9 w-9 min-w-[36px] items-center justify-center rounded-lg bg-white/[0.08]">
            <Mail className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-[2px] text-white/40">Support</span>
            <a href="mailto:trade11.service@gmail.com" className="text-[13px] font-medium text-white/80 hover:text-white transition-colors">
              trade11.service@gmail.com
            </a>
          </div>
        </div>

        {/* Legal company block */}
        <div className="border-t border-white/[0.08] pt-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/50">STREZONIC PRIVATE LIMITED</p>
          <p className="mt-1.5 text-[10px] leading-[1.7] text-white/30">
            CIN: U62099MH2025PTC453360 · PAN: ABQCS8594P<br />
            Registered: Virar, Vasai, Thane-401303, Maharashtra
          </p>
        </div>

        {/* SEBI disclaimer */}
        <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3.5">
          <p className="text-[10px] leading-relaxed text-white/25">
            TradeCircle is a technology marketplace platform operated by STREZONIC PRIVATE LIMITED (CIN: U62099MH2025PTC453360). We are not a SEBI registered investment advisor. All advisors listed are independently SEBI registered and solely responsible for their recommendations. Investment in securities is subject to market risks. Past performance does not guarantee future results.
          </p>
        </div>

        {/* Copyright */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] text-white/30">© 2026 TradeCircle</span>
          <span className="text-[11px] text-white/30">Built for Indian Traders</span>
        </div>
      </div>
    </footer>
  );
}
