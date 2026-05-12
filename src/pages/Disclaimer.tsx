import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="tc-section">
        <div className="container mx-auto max-w-3xl">
          <h1 className="tc-page-title mb-8">Disclaimer</h1>
          <div className="tc-card p-8 space-y-5 text-[15px] text-muted-foreground leading-relaxed">
            <p>TradeCircle is a technology platform that connects traders with SEBI-registered investment advisors.</p>
            <p>TradeCircle does not provide investment advice, portfolio management, or trading recommendations. All investment decisions are made solely by the user.</p>
            <p>Advisors listed on the platform are independent SEBI-registered professionals responsible for the advice they provide.</p>
            <p>TradeCircle does not guarantee profits, returns, or performance of any advisor or trading strategy.</p>
            <p>Trading in financial markets involves substantial risk and may result in loss of capital. Users should carefully consider their financial situation before acting on any advisory signals.</p>
            <p>By using this platform, you acknowledge that TradeCircle acts only as a technology marketplace connecting advisors and traders.</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
