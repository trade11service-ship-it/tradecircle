import { useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/HeroSection";
import { TrustBadges } from "@/components/TrustBadges";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, Shield, Clock, Users } from "lucide-react";
import { setMetaTags, SEO_CONFIG } from "@/lib/seo";

export default function About() {
  useEffect(() => {
    setMetaTags(SEO_CONFIG.about);
  }, []);
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <HeroSection
        title="How TradeCircle Verifies Trading Advisors"
        subtitle="We manually verify every SEBI registered advisor to ensure transparency, compliance, and legitimate trading signals delivered to your inbox."
      />

      <main className="mx-auto w-full max-w-4xl px-4 py-12">
        {/* Mission Statement */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Our Mission: Trust in Trading
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                TradeCircle was built to solve a critical problem in Indian trading communities: 
                how do you find <strong>verified, legitimate trading advisors</strong> when fake tips and unregistered channels flood Telegram?
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed mb-4">
                Every advisor on TradeCircle is <strong>SEBI verified</strong>, with public track records, 
                and transparent signal delivery. No hidden fees. No unverified promises.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We believe traders deserve a platform where compliance and transparency are non-negotiable.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-8 border border-slate-200">
              <h3 className="text-xl font-bold text-foreground mb-6">Why TradeCircle?</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground"><strong>SEBI Verified Only</strong> — Manual verification process</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground"><strong>Public Track Records</strong> — Every signal visible</span>
                </li>
                <li className="flex gap-3">
                  <Clock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground"><strong>Cancel Anytime</strong> — No lock-in periods</span>
                </li>
                <li className="flex gap-3">
                  <Users className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground"><strong>Community Trust</strong> — 100K+ active traders</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Advisor Verification Process */}
        <section className="mb-16 bg-slate-50 rounded-lg p-8 border border-slate-200">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Our 5-Step Advisor Verification Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              { step: 1, title: "SEBI Registration", desc: "Verify INH/IA registration number" },
              { step: 2, title: "Identity Check", desc: "Confirm legal name and details" },
              { step: 3, title: "Track Records", desc: "Validate signal history and accuracy" },
              { step: 4, title: "Compliance Review", desc: "Check regulatory compliance status" },
              { step: 5, title: "Approval", desc: "Final verification before listing" },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-bold mb-3 mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Regulatory Compliance */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-6">
            Regulatory Compliance & Safety
          </h2>
          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded">
            <p className="text-foreground leading-relaxed mb-4">
              <strong>SEBI Disclaimer:</strong> All TradeCircle advisors are SEBI registered (category: Investment Advisor or Research Analyst). 
              However, trading involves risk, and past performance does not guarantee future results. Each advisor is solely responsible for maintaining 
              regulatory compliance, and all users trade at their own risk.
            </p>
            <p className="text-foreground leading-relaxed">
              <strong>How to Verify an Advisor:</strong> Visit the SEBI-IORD database 
              (<a href="https://www.iord.sebi.gov.in/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">www.iord.sebi.gov.in</a>) 
              and search the SEBI registration number (shown on every advisor's profile on TradeCircle).
            </p>
          </div>
        </section>

        {/* Trust Badges Section */}
        <TrustBadges variant="full" />

        {/* FAQ Section */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              {
                q: "How do I know if a trading advisor is SEBI verified?",
                a: "All advisors on TradeCircle are SEBI verified. Look for the green SEBI verification badge on their profile. You can also visit SEBI's official IORD database to double-check their registration status."
              },
              {
                q: "Is TradeCircle regulated?",
                a: "TradeCircle itself is a technology platform. All advisors using TradeCircle are SEBI registered and comply with SEBI regulations. We do not provide investment advice; we only facilitate connections between verified advisors and traders."
              },
              {
                q: "Can I get my money back if a signal goes wrong?",
                a: "TradeCircle is a signal delivery platform. Trades are executed through your existing broker account. Each advisor clearly discloses risk parameters (entry, target, stop-loss). You maintain full control over your account and trades."
              },
              {
                q: "How do I report a suspicious advisor?",
                a: "If you believe an advisor is violating regulations or providing false information, you can report them directly to SEBI or contact our support team at support@tradecircle.in."
              },
              {
                q: "What happens if I cancel my subscription?",
                a: "You can cancel your subscription to any advisor at any time. Your access ends immediately, and no further charges will be applied. Past signals remain visible in your archive for reference."
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-card rounded-lg p-6 border border-slate-200">
                <h3 className="font-bold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Find SEBI Verified Trading Advisors?
          </h2>
          <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
            Browse 500+ manually verified advisors with public track records and transparent signal delivery.
          </p>
          <Link to="/discover">
            <Button size="lg" className="bg-white text-green-600 hover:bg-white/90 font-bold">
              Browse Verified Advisors
            </Button>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
