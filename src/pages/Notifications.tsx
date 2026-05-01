
import { Bell } from "lucide-react";

export default function Notifications() {
  return (
    <div className="min-h-full h-full bg-muted">
      
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-primary" />
          <h1 className="mt-3 text-xl font-extrabold text-foreground">Notifications</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Real-time signal alerts will appear here. This screen is ready for notification feed wiring.
          </p>
        </div>
      </main>
    </div>
  );
}
