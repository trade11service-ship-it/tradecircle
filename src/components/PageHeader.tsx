import { ReactNode } from 'react';
import { Logo } from './Logo';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badges?: { icon?: ReactNode; label: string }[];
  right?: ReactNode;
}

/**
 * Unified in-page header used across primary routes (Discover, Explore, etc.).
 * Keeps RA Circle branding consistent: white surface, navy monogram logo,
 * concise title + subtitle, and optional trust badges beneath.
 */
export function PageHeader({ eyebrow, title, subtitle, badges, right }: PageHeaderProps) {
  return (
    <header className="w-full border-b border-border bg-card">
      <div className="container mx-auto max-w-5xl px-4 py-5 md:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background shrink-0">
              <Logo size={26} />
            </div>
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {eyebrow}
                </p>
              )}
              <h1
                className="truncate text-xl md:text-2xl font-extrabold tracking-tight text-foreground"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 text-xs md:text-sm text-muted-foreground line-clamp-2">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>

        {badges && badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-muted-foreground"
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
