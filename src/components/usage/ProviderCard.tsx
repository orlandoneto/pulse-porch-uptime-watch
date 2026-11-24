import type { SectionState } from "@/lib/usage/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const STATE_LABEL: Record<SectionState, string> = {
  live: "ao vivo",
  partial: "parcial",
  no_credentials: "sem credencial",
  error: "erro",
  unavailable: "indisponível",
};

const STATE_CLASS: Record<SectionState, string> = {
  live: "border-success/40 bg-success/10 text-success",
  partial: "border-warning/40 bg-warning/10 text-warning",
  no_credentials: "border-border bg-muted text-muted-foreground",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
  unavailable: "border-border bg-muted text-muted-foreground",
};

export function SectionStateBadge({ state }: { state: SectionState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
        STATE_CLASS[state],
      )}
    >
      {STATE_LABEL[state]}
    </span>
  );
}

export function ProviderCard({
  title,
  subtitle,
  icon,
  state,
  message,
  children,
  right,
}: {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  state: SectionState;
  message?: string | null;
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="panel space-y-4 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 text-primary [&_svg]:size-4">{icon}</span>
          <div className="min-w-0">
            <h2 className="font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {right}
          <SectionStateBadge state={state} />
        </div>
      </header>
      {message && (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
          {message}
        </p>
      )}
      {children}
    </section>
  );
}

export function MetricList({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
