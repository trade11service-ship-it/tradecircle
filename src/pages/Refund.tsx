import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Refund() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="tc-section">
        <div className="container mx-auto max-w-3xl">
          <h1 className="tc-page-title mb-8">Refund Policy</h1>
          <div className="tc-card p-8 space-y-5 text-[15px] text-muted-foreground leading-relaxed">
            <p>All advisor subscriptions on StockCircle are <strong className="text-foreground">non-refundable</strong>.</p>
            <p>Once a subscription is purchased, users will receive access to the advisor's signal group or channel for the selected duration.</p>
            <p>StockCircle does not control the trading performance of advisors and therefore cannot guarantee results.</p>
            <p>Users are encouraged to review advisor profiles, performance history, and strategy details before subscribing.</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
