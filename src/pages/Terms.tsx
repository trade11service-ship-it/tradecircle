import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="tc-section">
        <div className="container mx-auto max-w-3xl">
          <h1 className="tc-page-title mb-8">Terms of Service</h1>
          <div className="tc-card p-8 space-y-5 text-[15px] text-muted-foreground leading-relaxed">
            <p>StockCircle provides a technology platform that allows users to discover and subscribe to SEBI-registered investment advisors.</p>
            <ol className="list-decimal list-inside space-y-3">
              <li>Users subscribe to advisors voluntarily.</li>
              <li>StockCircle does not participate in trading activity or provide financial advice.</li>
              <li>Advisors are responsible for the signals and strategies they share with subscribers.</li>
              <li>StockCircle does not guarantee profitability or trading outcomes.</li>
              <li>Users agree that trading involves financial risk and losses may occur.</li>
              <li>Any disputes regarding advisory services must be resolved directly between the advisor and the user.</li>
              <li>StockCircle reserves the right to remove advisors or users who violate platform policies.</li>
            </ol>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
