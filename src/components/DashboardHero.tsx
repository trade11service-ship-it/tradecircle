import { ReactNode } from "react";
import { Shield, Sparkles } from "lucide-react";

type Stat = { label: string; value: string | number; accent?: "default" | "success" | "warn" };

interface DashboardHeroProps {
  name: string;
  roleLabel: string;          // e.g. "Trader" | "SEBI Advisor" | "Super Admin"
  subtitle?: string;           // line under greeting
  badge?: string;              // small pill (e.g. SEBI reg, "Platform Live")
  variant?: "trader" | "advisor" | "admin";
  stats?: Stat[];              // up to 4 inline KPIs
  actions?: ReactNode;         // CTA buttons
}

const greetingFor = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const variantBg: Record<NonNullable<DashboardHeroProps["variant"]>, string> = {
  trader: "from-secondary via-secondary to-primary",     // navy -> green
  advisor: "from-primary via-primary to-secondary",      // green -> navy
  admin: "from-[hsl(220,40%,15%)] via-[hsl(214,89%,22%)] to-secondary", // executive dark
};

export function DashboardHero({
  name,
  roleLabel,
  subtitle,
  badge,
  variant = "trader",
  stats = [],
  actions,
}: DashboardHeroProps) {
  const first = (name || "There").split(" ")[0];
  return (
    <section
      className={`relative overflow-hidden rounded-3xl mb-6 text-white bg-gradient-to-br ${variantBg[variant]} shadow-[0_10px_30px_-12px_rgba(13,71,161,0.45)]`}
    >
      {/* Decorative layers */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }} />
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-16 h-56 w-56 rounded-full bg-white/5 blur-3xl" />

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/90 border border-white/15">
              <Sparkles className="h-3 w-3" /> {roleLabel}
            </div>
            <h1 className="mt-3 text-[26px] sm:text-[32px] leading-tight font-black tracking-tight">
              {greetingFor()}, <span className="text-white">{first}</span>
            </h1>
            {subtitle && (
              <p className="mt-1.5 text-[13px] sm:text-sm text-white/80 max-w-xl">
                {subtitle}
              </p>
            )}
            {badge && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur px-3 py-1 text-[11px] font-semibold text-white/95">
                <Shield className="h-3 w-3" /> {badge}
              </div>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>

        {stats.length > 0 && (
          <div
            className={`mt-6 grid gap-2.5 ${
              stats.length === 4
                ? "grid-cols-2 sm:grid-cols-4"
                : stats.length === 3
                ? "grid-cols-3"
                : "grid-cols-2"
            }`}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 px-3 py-2.5 sm:px-4 sm:py-3 hover:bg-white/15 transition-colors"
              >
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/70">
                  {s.label}
                </p>
                <p className="text-lg sm:text-2xl font-black tracking-tight mt-0.5 text-white">
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
