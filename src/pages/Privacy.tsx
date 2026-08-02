import { Footer } from '@/components/Footer';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      
      <section className="tc-section">
        <div className="container mx-auto max-w-3xl">
          <h1 className="tc-page-title mb-8">Privacy Policy</h1>
          <div className="tc-card p-8 space-y-5 text-[15px] text-muted-foreground leading-relaxed">
            <p>RA Circle collects basic user information such as name, email address, and account details required to operate the platform.</p>
            <p>This information is used only for:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>Account creation</li>
              <li>Subscription management</li>
              <li>Platform notifications</li>
            </ul>
            <p>RA Circle does not sell user data to third parties.</p>
            <p>Payment transactions are processed through third-party payment providers such as Razorpay or Stripe.</p>

            <h2 className="text-[17px] font-bold text-foreground pt-2">Identity verification &amp; authorised processors</h2>
            <p>
              Where regulation requires it, we verify identity and bank ownership through <strong>Digio</strong>, an authorised
              data processor engaged by STREZONIC PRIVATE LIMITED. Digio processes PAN details and performs bank account
              penny-drop checks strictly on our instructions for identity match, SEBI compliance and payout processing.
            </p>
            <p>
              We <strong>do not collect Aadhaar numbers</strong>. PAN and bank account numbers are stored encrypted, are never
              displayed in unmasked form, and we retain only the verification transaction reference, verdict and timestamp
              from our verification partner — never the raw vendor response.
            </p>
            <p>Verification applies as follows:</p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li><strong>Course buyers</strong> — no identity verification. Email and phone only.</li>
              <li><strong>Advisory subscribers</strong> — PAN verification before subscribing, for SEBI client due diligence.</li>
              <li><strong>Course creators</strong> — PAN and bank verification, unlocked after a course is approved, for payouts.</li>
              <li><strong>SEBI advisors</strong> — SEBI registration verified manually, then PAN and bank verification before group creation.</li>
            </ul>

            <h2 className="text-[17px] font-bold text-foreground pt-2">Retention &amp; automatic erasure</h2>
            <p>
              Sensitive identity data attached to failed or abandoned verification attempts is automatically scrubbed after
              60 days. Advisor applications that remain un-actioned for 60 days are expired and their identity fields erased.
              Records required for SEBI audit (agreements, consent metadata and payment references) are retained for five years.
            </p>
            <p>Users may request deletion of their account and associated data at any time.</p>

          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
