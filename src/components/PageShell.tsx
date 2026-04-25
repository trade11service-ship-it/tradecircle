import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  className?: string;
}

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageShell({ children, className }: PageShellProps) {
  return <div className={cn("min-h-screen bg-background", className)}>{children}</div>;
}

export function PageSection({ children, className, compact = false }: PageSectionProps) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-6xl px-4 sm:px-6",
        compact ? "py-6 sm:py-8" : "py-10 sm:py-12",
        className,
      )}
    >
      {children}
    </section>
  );
}
