import { Navbar } from "@/components/Navbar";

export default function About() {
  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-extrabold text-foreground">About TradeCircle</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            TradeCircle helps traders discover verified advisors, follow analysis,
            and subscribe to premium signal groups in a simple chat-style experience.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Our goal is transparent, compliant, and mobile-first investing communities
            with a clean signal flow and clear risk communication.
          </p>
        </div>
      </main>
    </div>
  );
}
