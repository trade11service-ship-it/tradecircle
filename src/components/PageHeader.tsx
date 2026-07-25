import { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badges?: { icon?: ReactNode; label: string }[];
  right?: ReactNode;
}

/**
 * Unified page header — white surface, left-aligned, no dark hero card.
 * Eyebrow (uppercase slate-500) · Title (navy) · Subtitle (slate-600) · optional pill row.
 */
export function PageHeader({ eyebrow, title, subtitle, badges, right }: PageHeaderProps) {
  return (
    <header className="w-full border-b border-border bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 md:py-10">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 max-w-[720px]">
            {eyebrow && (
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl md:text-[32px] font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-[15px] text-[hsl(var(--body))] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>

        {badges && badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
              >
                {b.icon}
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
