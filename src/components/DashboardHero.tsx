import { ReactNode } from "react";
import { Shield } from "lucide-react";

type Stat = { label: string; value: string | number; accent?: "default" | "success" | "warn" };

interface DashboardHeroProps {
  name: string;
  roleLabel: string;
  subtitle?: string;
  badge?: string;
  variant?: "trader" | "advisor" | "admin";
  stats?: Stat[];
  actions?: ReactNode;
}

const greetingFor = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

/**
 * Flat, dense dashboard header — no gradients, no orbs, no glass blur.
 * Solid navy surface, restrained KPI tiles.
 */
export function DashboardHero({
  name,
  roleLabel,
  subtitle,
  badge,
  stats = [],
  actions,
}: DashboardHeroProps) {
  const first = (name || "There").split(" ")[0];
  return (
    <section className="rounded-xl bg-primary text-primary-foreground mb-6 border border-primary">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              {roleLabel}
            </p>
            <h1 className="mt-1 text-[24px] sm:text-[28px] leading-tight font-bold tracking-tight text-white">
              {greetingFor()}, {first}
            </h1>
            {subtitle && (
              <p className="mt-2 text-[14px] text-white/70 max-w-xl leading-relaxed">
                {subtitle}
              </p>
            )}
            {badge && (
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/90">
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
            className={`mt-5 grid gap-3 ${
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
                className="rounded-[10px] bg-white/5 border border-white/10 px-3 py-3"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                  {s.label}
                </p>
                <p className="mt-1 text-[20px] font-bold tabular-nums text-white">
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
