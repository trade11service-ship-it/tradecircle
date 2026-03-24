import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

export default function Subscriptions() {
  return (
    <div className="min-h-screen bg-muted">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-extrabold text-foreground">My Subscriptions</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A full subscription manager is coming next. You can currently access your active groups from dashboard/home feed.
          </p>
          <Link to="/home">
            <Button className="mt-4">Open Home Feed</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
