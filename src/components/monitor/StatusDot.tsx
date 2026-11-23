import { cn } from "@/lib/utils";
import type { Status } from "@/lib/monitor/types";

const tone: Record<Status | "paused", string> = {
  up: "bg-success",
  down: "bg-destructive",
  unknown: "bg-muted-foreground",
  paused: "bg-warning",
};

export function StatusDot({ status, className }: { status: Status | "paused"; className?: string }) {
  return (
    <span className={cn("relative inline-flex size-2.5 shrink-0", className)}>
      {(status === "up" || status === "down") && (
        <span className={cn("absolute inset-0 rounded-full animate-status-ping", tone[status])} />
      )}
      <span className={cn("relative inline-flex size-2.5 rounded-full", tone[status])} />
    </span>
  );
}

export const statusLabel: Record<Status | "paused", string> = {
  up: "No ar",
  down: "Fora do ar",
  unknown: "Verificando",
  paused: "Pausado",
};

export function StatusPill({ status }: { status: Status | "paused" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider",
        status === "up" && "border-success/30 bg-success/10 text-success",
        status === "down" && "border-destructive/40 bg-destructive/15 text-destructive",
        status === "unknown" && "border-border bg-muted text-muted-foreground",
        status === "paused" && "border-warning/30 bg-warning/10 text-warning",
      )}
    >
      <StatusDot status={status} className="size-1.5 [&>span]:size-1.5" />
      {statusLabel[status]}
    </span>
  );
}
