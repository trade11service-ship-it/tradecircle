import { Link } from 'react-router-dom';

export function Footer() {
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

        <div className="mt-12 border-t border-secondary-foreground/20 pt-6">
          <p className="text-xs leading-relaxed opacity-60">
            ⚠️ Important Disclaimer: TradeCircle is a technology platform that lists SEBI-registered investment advisors. We are NOT a SEBI registered investment advisor or research analyst. We do not provide investment advice or trading signals. All advisors on this platform are independently SEBI registered and solely responsible for their own advice. Investments are subject to market risks. Past performance is not indicative of future results. Please verify advisor credentials before subscribing.
          </p>
        </div>

        <div className="mt-4 text-center text-xs opacity-50">
          © 2026 TradeCircle. All rights reserved. | Made with ❤️ for Indian Traders
        </div>
      </div>
    </footer>
  );
}
