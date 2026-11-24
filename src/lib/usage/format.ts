import type { QuotaUnit } from "./types";

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const scaled = value / 1_000_000;
    return `${scaled.toFixed(Math.abs(scaled) >= 100 ? 0 : 1).replace(".", ",")} mi`;
  }
  if (abs >= 1_000) {
    const scaled = value / 1_000;
    return `${scaled.toFixed(Math.abs(scaled) >= 100 ? 0 : 1).replace(".", ",")} mil`;
  }
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "—";
  const abs = Math.abs(bytes);
  const gb = 1024 ** 3;
  const mb = 1024 ** 2;
  if (abs >= gb) return `${(bytes / gb).toFixed(2).replace(".", ",")} GB`;
  if (abs >= mb) return `${(bytes / mb).toFixed(1).replace(".", ",")} MB`;
  if (abs >= 1024) return `${(bytes / 1024).toFixed(1).replace(".", ",")} KB`;
  return `${Math.round(bytes)} B`;
}

export function formatMetricValue(value: number | null, unit: QuotaUnit): string {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (unit) {
    case "bytes":
      return formatBytes(value);
    case "hours":
      return `${value.toFixed(1).replace(".", ",")} h`;
    case "ms":
      return `${Math.round(value)} ms`;
    case "percent":
      return `${value.toFixed(0)}%`;
    case "requests":
    case "count":
      return compactNumber(value);
  }
}

export function formatPercent(percent: number | null): string {
  if (percent == null || !Number.isFinite(percent)) return "—";
  const rounded = Math.round(percent * 10) / 10;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(rounded)}%`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(date);
}
