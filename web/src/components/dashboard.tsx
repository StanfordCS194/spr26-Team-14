import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <section className={cn("grid gap-3", className)}>
      {(title || description || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-0.5">
            {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
            {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatRow({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("flex flex-wrap gap-x-10 gap-y-4", className)}>{children}</dl>;
}

export function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}
