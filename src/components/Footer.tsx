import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { FOOTER_DISCLAIMERS } from '@/lib/legalTexts';

export function Footer() {
  const disclaimer = useMemo(() => {
    return FOOTER_DISCLAIMERS[Math.floor(Math.random() * FOOTER_DISCLAIMERS.length)];
  }, []);

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1 */}
          <div>
            <p className="text-xl font-extrabold">TradeCircle</p>
            <p className="mt-3 text-sm opacity-80">
              India's marketplace for SEBI-registered trading advisors.
            </p>
          </div>

          {/* Col 2 */}
          <div>
            <p className="mb-3 font-semibold">Platform</p>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/#advisors" className="hover:opacity-100 transition-opacity">Browse Advisors</Link></li>
              <li><Link to="/advisor-register" className="hover:opacity-100 transition-opacity">Register as Advisor</Link></li>
              <li><Link to="/#how-it-works" className="hover:opacity-100 transition-opacity">How It Works</Link></li>
              <li><Link to="/login" className="hover:opacity-100 transition-opacity">Sign In / Sign Up</Link></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <p className="mb-3 font-semibold">Legal</p>
            <ul className="space-y-2 text-sm opacity-80">
              <li><Link to="/privacy" className="hover:opacity-100 transition-opacity">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:opacity-100 transition-opacity">Terms of Service</Link></li>
              <li><Link to="/refund" className="hover:opacity-100 transition-opacity">Refund Policy</Link></li>
              <li><Link to="/disclaimer" className="hover:opacity-100 transition-opacity">Disclaimer</Link></li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <p className="mb-3 font-semibold">Support</p>
            <ul className="space-y-2 text-sm opacity-80">
              <li>📧 support@tradecircle.in</li>
              <li>Built for Indian Traders 🇮🇳</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-yellow-600/30 bg-yellow-50/10 px-4 py-2.5">
          <p className="text-[11px] leading-relaxed text-secondary-foreground/70">
            ℹ️ Signals on this platform are posted by independently SEBI-registered advisors. TradeCircle (STREZONIC PRIVATE LIMITED) is a listing platform only. Always trade with proper risk management.
          </p>
        </div>

        <div className="mt-4 border-t border-secondary-foreground/20 pt-6">
          <p className="text-xs leading-relaxed opacity-60">
            {disclaimer}
          </p>
        </div>

        <div className="mt-4 text-center text-xs opacity-50">
          © 2026 TradeCircle (STREZONIC PRIVATE LIMITED). All rights reserved. | Made with ❤️ for Indian Traders
        </div>
      </div>
    </footer>
  );
}
