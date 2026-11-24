import { Badge } from "@/components/ui/badge";
import { formatMetricValue, formatPercent } from "@/lib/usage/format";
import { levelFromMetric, quotaPercent } from "@/lib/usage/thresholds";
import type { QuotaMetric } from "@/lib/usage/types";
import { cn } from "@/lib/utils";

const LEVEL_BAR: Record<string, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  critical: "bg-destructive",
  unknown: "bg-muted-foreground/40",
};

export function QuotaMeter({ metric }: { metric: QuotaMetric }) {
  const percent = metric.unavailable ? null : quotaPercent(metric.used, metric.limit);
  const level = levelFromMetric(metric);
  const width = percent == null ? 0 : Math.min(100, Math.max(0, percent));

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm">{metric.label}</span>
        <span className="shrink-0 font-mono text-xs tabular text-muted-foreground">
          {formatMetricValue(metric.used, metric.unit)}
          {metric.limit != null && (
            <span className="text-muted-foreground/70">
              {" / "}
              {formatMetricValue(metric.limit, metric.unit)}
            </span>
          )}
          {percent != null && <span className="ml-2">{formatPercent(percent)}</span>}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", LEVEL_BAR[level])}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="flex items-center gap-2">
        {metric.unavailable && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            indisponível
          </Badge>
        )}
        {currentlyLabel(level) && (
          <span
            className={cn(
              "font-mono text-[10px] uppercase tracking-wide",
              level === "critical" ? "text-destructive" : "text-warning",
            )}
          >
            {currentlyLabel(level)}
          </span>
        )}
        {metric.note && <p className="text-xs text-muted-foreground">{metric.note}</p>}
      </div>
    </div>
  );
}

function currentlyLabel(level: string): string | null {
  if (level === "warn") return "atenção (≥70%)";
  if (level === "critical") return "crítico (≥90%)";
  return null;
}
