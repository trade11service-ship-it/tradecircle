import { Link } from 'react-router-dom';
import { Mail, Shield, Heart, Github, Linkedin, Twitter, ExternalLink, ArrowRight } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-[0.15] pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10">
        {/* Top Section - Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="container mx-auto px-5 pt-16 md:pt-20">
          {/* Hero Section */}
          <div className="mb-14 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3 leading-tight">
              Join India's Trading Advisor Marketplace
            </h2>
            <p className="text-white/70 text-[15px] leading-relaxed mb-6">
              Connect with SEBI-verified advisors. Get signals. Track performance. Subscribe monthly. Cancel anytime.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/discover" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold hover:shadow-lg hover:shadow-primary/50 transition-all hover:scale-105 duration-300">
                Browse Advisors <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/advisor-register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-bold hover:bg-white/10 transition-all duration-300 backdrop-blur-sm">
                Become an Advisor
              </Link>
            </div>
          </div>

          {/* Grid Section */}
          <div className="grid md:grid-cols-4 gap-8 mb-12 py-10 border-t border-white/10">
            {/* Column 1: Platform */}
            <div className="group">
              <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-white/50 mb-4">Platform</h3>
              <nav className="space-y-2.5">
                {[
                  { to: '/discover', label: 'Browse Advisors' },
                  { to: '/advisor-register', label: 'Register as Advisor' },
                  { to: '/login', label: 'Sign In / Sign Up' },
                ].map(l => (
                  <Link 
                    key={l.to} 
                    to={l.to} 
                    className="text-[14px] text-white/60 hover:text-primary transition-colors duration-300 flex items-center gap-1.5 group/link"
                  >
                    <span className="h-1.5 w-1.5 bg-primary/0 group-hover/link:bg-primary rounded-full transition-all" />
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Column 2: Legal */}
            <div className="group">
              <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-white/50 mb-4">Legal</h3>
              <nav className="space-y-2.5">
                {[
                  { to: '/privacy', label: 'Privacy Policy' },
                  { to: '/terms', label: 'Terms of Service' },
                  { to: '/refund', label: 'Refund Policy' },
                  { to: '/disclaimer', label: 'Risk Disclaimer' },
                ].map(l => (
                  <Link 
                    key={l.to} 
                    to={l.to} 
                    className="text-[14px] text-white/60 hover:text-primary transition-colors duration-300 flex items-center gap-1.5 group/link"
                  >
                    <span className="h-1.5 w-1.5 bg-primary/0 group-hover/link:bg-primary rounded-full transition-all" />
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Column 3: Support */}
            <div className="group">
              <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-white/50 mb-4">Support</h3>
              <nav className="space-y-2.5">
                <a 
                  href="mailto:support@tradecircle.in" 
                  className="text-[14px] text-white/60 hover:text-primary transition-colors duration-300 flex items-center gap-1.5 group/link"
                >
                  <span className="h-1.5 w-1.5 bg-primary/0 group-hover/link:bg-primary rounded-full transition-all" />
                  Email Support
                </a>
                <a 
                  href="https://scores.gov.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[14px] text-white/60 hover:text-primary transition-colors duration-300 flex items-center gap-1.5 group/link"
                >
                  <span className="h-1.5 w-1.5 bg-primary/0 group-hover/link:bg-primary rounded-full transition-all" />
                  SEBI SCORES <ExternalLink className="h-3 w-3" />
                </a>
                <a 
                  href="https://www.sebi.gov.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[14px] text-white/60 hover:text-primary transition-colors duration-300 flex items-center gap-1.5 group/link"
                >
                  <span className="h-1.5 w-1.5 bg-primary/0 group-hover/link:bg-primary rounded-full transition-all" />
                  SEBI Official <ExternalLink className="h-3 w-3" />
                </a>
              </nav>
            </div>

            {/* Column 4: Connect */}
            <div className="group">
              <h3 className="text-[12px] font-bold uppercase tracking-[2px] text-white/50 mb-4">Connect</h3>
              <div className="flex gap-3 flex-wrap mb-4">
                {[
                  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
                  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
                  { icon: Github, href: 'https://github.com', label: 'GitHub' },
                ].map(s => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="h-10 w-10 rounded-lg border border-white/20 bg-white/5 hover:bg-primary hover:border-primary flex items-center justify-center text-white/60 hover:text-white transition-all duration-300 hover:scale-110 backdrop-blur-sm group/social"
                  >
                    <s.icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
              <a 
                href="mailto:support@tradecircle.in" 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:text-primary hover:border-primary/50 transition-all duration-300 text-[13px] font-medium"
              >
                <Mail className="h-4 w-4" />
                support@tradecircle.in
              </a>
            </div>
          </div>

          {/* SEBI Compliance Section */}
          <div className="mb-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 backdrop-blur-sm">
            <div className="flex gap-3 mb-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-bold text-white mb-2">SEBI Compliance & Disclaimer</h4>
                <p className="text-[13px] leading-relaxed text-white/70">
                  TradeCircle is a technology marketplace operated by <strong>STREZONIC PRIVATE LIMITED</strong> (CIN: U62099MH2025PTC453360, PAN: ABQCS8594P). We are <strong>not a SEBI-registered investment advisor</strong>. All advisors listed are independently SEBI-registered and solely responsible for their recommendations. <strong>Investment in securities carries risk.</strong> Past performance does not guarantee future results. Always consult with a financial advisor before making investment decisions.
                </p>
              </div>
            </div>
            <div className="text-[12px] text-white/50 border-t border-white/10 pt-3 mt-3 space-y-1">
              <p>📧 For Grievances: <a href="mailto:grievance@tradecircle.in" className="text-primary hover:underline">grievance@tradecircle.in</a></p>
              <p>🏛️ Check SEBI Registration: <a href="https://www.sebi.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.sebi.gov.in</a></p>
              <p>📋 File Complaints: <a href="https://scores.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">SEBI SCORES Portal</a></p>
            </div>
          </div>

          {/* Company Info */}
          <div className="grid md:grid-cols-3 gap-6 mb-10 py-10 border-t border-white/10">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">Registered Office</p>
              <p className="text-[13px] leading-relaxed text-white/60">
                STREZONIC PRIVATE LIMITED<br />
                Virar, Vasai<br />
                Thane-401303, Maharashtra <br />
                India
              </p>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">Company Details</p>
              <div className="space-y-1 text-[13px] text-white/60">
                <p><span className="text-white/40">CIN:</span> U62099MH2025PTC453360</p>
                <p><span className="text-white/40">PAN:</span> ABQCS8594P</p>
                <p><span className="text-white/40">Type:</span> Private Limited</p>
              </div>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[1.5px] text-white/40 mb-2">Quick Facts</p>
              <div className="space-y-1.5 text-[13px]">
                <p className="text-white/60">✓ 100% SEBI Verified Advisors</p>
                <p className="text-white/60">✓ No Lock-in Period</p>
                <p className="text-white/60">✓ Built for Indian Traders</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 bg-black/50 backdrop-blur-sm">
          <div className="container mx-auto px-5 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-white">Trade<span className="text-primary">Circle</span></span>
              <span className="text-white/30">·</span>
              <span className="text-[12px] text-white/50">© {currentYear} All rights reserved</span>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-white/50">
              <span>Made with</span>
              <Heart className="h-3.5 w-3.5 text-primary fill-primary" />
              <span>for Indian Traders</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
