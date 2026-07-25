import { Link } from 'react-router-dom';
import { Mail, ExternalLink } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-[hsl(var(--surface-alt))]">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="inline-flex items-center">
              <Logo size={28} />
            </div>
            <p className="mt-3 text-[13px] text-[hsl(var(--body))] leading-relaxed max-w-xs">
              India's SEBI-only advisory marketplace. Verified analysts. Tamper-proof records.
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">Platform</h3>
            <nav className="space-y-2">
              {[
                { to: '/discover', label: 'Browse advisors' },
                { to: '/explore', label: 'Public feed' },
                { to: '/advisor-register', label: 'Register as advisor' },
                { to: '/login', label: 'Sign in' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="block text-[13px] text-[hsl(var(--body))] hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">Legal</h3>
            <nav className="space-y-2">
              {[
                { to: '/privacy', label: 'Privacy policy' },
                { to: '/terms', label: 'Terms of service' },
                { to: '/refund', label: 'Refund policy' },
                { to: '/disclaimer', label: 'Disclaimer' },
              ].map(l => (
                <Link key={l.to} to={l.to} className="block text-[13px] text-[hsl(var(--body))] hover:text-foreground transition-colors">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">Support</h3>
            <nav className="space-y-2">
              <a href="mailto:support@racircle.in" className="flex items-center gap-1.5 text-[13px] text-[hsl(var(--body))] hover:text-foreground transition-colors">
                <Mail className="h-3.5 w-3.5" /> support@racircle.in
              </a>
              <a href="https://scores.gov.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-[hsl(var(--body))] hover:text-foreground transition-colors">
                SEBI SCORES <ExternalLink className="h-3 w-3" />
              </a>
            </nav>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            RA Circle is operated by <span className="font-semibold text-foreground">STREZONIC PRIVATE LIMITED</span> (CIN: U62099MH2025PTC453360).
            We are <span className="font-semibold text-foreground">not a SEBI-registered investment advisor</span>. All advisors listed are
            independently SEBI-registered Research Analysts (INH holders). Investment in securities carries market risk. Past performance does not
            guarantee future results.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[12px] text-muted-foreground">
            <span>© {currentYear} RA Circle · STREZONIC PVT LTD</span>
            <span>Grievance: <a href="mailto:grievance@racircle.in" className="text-foreground hover:underline">grievance@racircle.in</a></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
