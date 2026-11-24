import type { QuotaAlert, QuotaLevel, QuotaMetric } from "./types";

/** 70% = atenção, 90% = crítico (briefing do painel de uso). */
export const WARN_PERCENT = 70;
export const CRITICAL_PERCENT = 90;

/**
 * Percentual usado da cota. Retorna null quando não há como calcular
 * (sem uso, sem limite, limite zero ou valores inválidos).
 */
export function quotaPercent(used: number | null, limit: number | null): number | null {
  if (used == null || limit == null) return null;
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return null;
  return Math.max(0, (used / limit) * 100);
}

export function quotaLevel(percent: number | null): QuotaLevel {
  if (percent == null || !Number.isFinite(percent)) return "unknown";
  if (percent >= CRITICAL_PERCENT) return "critical";
  if (percent >= WARN_PERCENT) return "warn";
  return "ok";
}

export function levelFromMetric(metric: QuotaMetric): QuotaLevel {
  if (metric.unavailable) return "unknown";
  return quotaLevel(quotaPercent(metric.used, metric.limit));
}

/** Alimenta o resumo "o que está perto do limite". Ignora métricas indisponíveis. */
export function collectAlerts(provider: string, metrics: QuotaMetric[]): QuotaAlert[] {
  const alerts: QuotaAlert[] = [];
  for (const metric of metrics) {
    const percent = quotaPercent(metric.used, metric.limit);
    const level = quotaLevel(percent);
    if (percent == null || (level !== "warn" && level !== "critical")) continue;
    alerts.push({
      provider,
      metricId: metric.id,
      label: metric.label,
      percent,
      level,
    });
  }
  return alerts;
}

/** Maior percentual primeiro, para o aviso mais grave aparecer no topo. */
export function summarizeAlerts(alerts: QuotaAlert[]): QuotaAlert[] {
  return [...alerts].sort((a, b) => b.percent - a.percent);
}
