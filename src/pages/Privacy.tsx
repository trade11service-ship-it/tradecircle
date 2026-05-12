import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="tc-section">
        <div className="container mx-auto max-w-3xl">
          <h1 className="tc-page-title mb-8">Privacy Policy</h1>
          <div className="tc-card p-8 space-y-5 text-[15px] text-muted-foreground leading-relaxed">
            <p>TradeCircle collects basic user information such as name, email address, and account details required to operate the platform.</p>
            <p>This information is used only for:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Account creation</li>
              <li>Subscription management</li>
              <li>Platform notifications</li>
            </ul>
            <p>TradeCircle does not sell user data to third parties.</p>
            <p>Payment transactions are processed through third-party payment providers such as Razorpay or Stripe.</p>
            <p>Users may request deletion of their account and associated data at any time.</p>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
