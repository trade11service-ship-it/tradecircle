import { useState } from "react";
import { Link } from "react-router-dom";
import { Compass, Radio, LineChart, X, Sparkles } from "lucide-react";

const STORAGE_KEY = "ra_tour_dismissed_v1";

export function QuickStartTour() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  if (dismissed) return null;

  const close = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setDismissed(true);
  };

  const steps = [
    {
      icon: Compass,
      title: "Discover verified advisors",
      body: "Browse SEBI-registered analysts and their strategies.",
      href: "/discover",
      cta: "Open Discover",
    },
    {
      icon: Radio,
      title: "Follow live signals",
      body: "Subscribe to a group to see real-time entries, targets, and stops.",
      href: "/explore",
      cta: "See Public Feed",
    },
    {
      icon: LineChart,
      title: "Track accountability",
      body: "Every signal is immutable — win/loss stays on record.",
      href: "/discover",
      cta: "Learn more",
    },
  ];

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm relative">
      <button
        onClick={close}
        aria-label="Dismiss quick start"
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-secondary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-secondary" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-foreground">Quick start</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Three steps to get the most out of RA Circle.</p>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-3">
        {steps.map((s) => (
          <Link
            key={s.title}
            to={s.href}
            className="group rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition p-3"
          >
            <s.icon className="h-4 w-4 text-secondary mb-1.5" />
            <p className="text-[13px] font-bold text-foreground leading-tight">{s.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.body}</p>
            <p className="text-[11px] font-semibold text-secondary mt-1.5 group-hover:underline">{s.cta} →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
