const VERCEL_ALIASES: Record<string, string[]> = {
  fastOriginTransfer: ["fastorigintransfer", "fast_origin_transfer", "fast-origin-transfer"],
  fastDataTransfer: ["fastdatatransfer", "fast_data_transfer", "fast-data-transfer"],
  cdnRequests: ["cdnrequests", "cdn_requests", "edgerequests", "edge_requests"],
  isrWrites: ["isrwrites", "isr_writes", "isr-writes"],
  deploymentStorage: ["deploymentstorage", "deployment_storage", "deploymentstoragesize"],
  fluidActiveCpu: ["fluidactivecpu", "fluid_active_cpu", "activecpu", "active_cpu"],
  functionInvocations: ["functioninvocations", "function_invocations", "invocations"],
};

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Lê um número de formatos comuns: 123, "123", { value: 123 }, { usage: 123 }. */
export function readNumeric(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value != null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["usage", "used", "value", "total", "count", "amount", "quantity"]) {
      const nested = readNumeric(record[key]);
      if (nested != null) return nested;
    }
  }
  return null;
}

export interface VercelUsageValue {
  value: number;
  unit: string | null;
}

export interface VercelUsageResult {
  values: Record<string, VercelUsageValue>;
  source: string | null;
}

function findNode(payload: unknown, aliases: string[], depth = 0): unknown {
  if (depth > 6 || payload == null || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (aliases.includes(normalizeKey(key))) return value;
  }
  for (const value of Object.values(record)) {
    const found = findNode(value, aliases, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function findUnit(node: unknown): string | null {
  if (node == null || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  for (const key of ["unit", "units", "usageUnit", "consumedUnit"]) {
    const raw = record[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return null;
}

/**
 * Extrai uso de respostas da Vercel sem depender de um schema fixo. A REST API
 * mudou ao longo do tempo (legado `/v1/usage` e FOCUS `/billing/charges`), então
 * procuramos aliases e devolvemos só o que for numérico.
 */
export function extractVercelUsage(
  payload: unknown,
  source: string | null = null,
): VercelUsageResult {
  const values: Record<string, VercelUsageValue> = {};
  for (const [metricId, aliases] of Object.entries(VERCEL_ALIASES)) {
    const node = findNode(payload, aliases);
    const value = readNumeric(node);
    if (value == null) continue;
    values[metricId] = { value, unit: findUnit(node) };
  }
  return { values, source };
}

function metricIdFromText(text: string): string | null {
  const normalized = text.toLowerCase();
  if (normalized.includes("fast origin transfer")) return "fastOriginTransfer";
  if (normalized.includes("fast data transfer")) return "fastDataTransfer";
  if (normalized.includes("cdn request") || normalized.includes("edge request"))
    return "cdnRequests";
  if (normalized.includes("isr") && normalized.includes("write")) return "isrWrites";
  if (normalized.includes("deployment") && normalized.includes("storage"))
    return "deploymentStorage";
  if (normalized.includes("active cpu") || normalized.includes("fluid cpu"))
    return "fluidActiveCpu";
  if (normalized.includes("function invocation") || normalized.includes("invocations")) {
    return "functionInvocations";
  }
  return null;
}

/**
 * Lê o endpoint FOCUS (/billing/charges): um array de cobranças com
 * `ChargeDescription`/`SkuId` e `ConsumedQuantity`/`ConsumedUnit`.
 */
export function extractFocusUsage(
  payload: unknown,
  source: string | null = null,
): VercelUsageResult {
  const values: Record<string, VercelUsageValue> = {};
  if (payload == null || typeof payload !== "object") return { values, source };
  const record = payload as Record<string, unknown>;
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(record["data"])
      ? record["data"]
      : Array.isArray(record["charges"])
        ? record["charges"]
        : [];

  for (const row of rows) {
    if (row == null || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const text = [
      item["ChargeDescription"],
      item["SkuId"],
      item["ResourceName"],
      item["ServiceName"],
    ]
      .filter((part): part is string => typeof part === "string")
      .join(" ");
    const metricId = metricIdFromText(text);
    if (!metricId) continue;
    const unitCandidates = [item["ConsumedUnit"], item["UsageUnit"]];
    const unit =
      unitCandidates.find(
        (part): part is string => typeof part === "string" && part.trim() !== "",
      ) ?? null;
    const value =
      readNumeric(item["ConsumedQuantity"]) ??
      readNumeric(item["UsageQuantity"]) ??
      readNumeric(item["BilledCost"]);
    if (value == null) continue;
    const current = values[metricId];
    values[metricId] = {
      value: (current?.value ?? 0) + value,
      unit: current?.unit ?? unit,
    };
  }
  return { values, source };
}

interface VercelProjectLike {
  id?: unknown;
  name?: unknown;
  latestDeployments?: unknown;
}

export interface ParsedVercelProjects {
  projects: Array<{ id: string; name: string; state: string | null }>;
}

export function parseVercelProjects(payload: unknown): ParsedVercelProjects {
  if (payload == null || typeof payload !== "object") return { projects: [] };
  const record = payload as Record<string, unknown>;
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(record["projects"])
      ? record["projects"]
      : [];
  const projects = raw
    .map((entry, index) => {
      if (entry == null || typeof entry !== "object") return null;
      const project = entry as VercelProjectLike;
      const name = typeof project.name === "string" ? project.name : `projeto-${index + 1}`;
      let state: string | null = null;
      if (Array.isArray(project.latestDeployments)) {
        const latest = project.latestDeployments[0];
        if (latest != null && typeof latest === "object") {
          const ready = (latest as Record<string, unknown>)["readyState"];
          if (typeof ready === "string") state = ready;
        }
      }
      return {
        id: typeof project.id === "string" ? project.id : name,
        name,
        state,
      };
    })
    .filter(
      (project): project is { id: string; name: string; state: string | null } => project != null,
    );
  return { projects };
}

interface VercelDeploymentLike {
  uid?: unknown;
  id?: unknown;
  createdAt?: unknown;
  readyState?: unknown;
  state?: unknown;
}

export interface ParsedVercelDeployments {
  count: number;
  latestAt: string | null;
}

export function parseVercelDeployments(payload: unknown): ParsedVercelDeployments {
  if (payload == null || typeof payload !== "object") return { count: 0, latestAt: null };
  const record = payload as Record<string, unknown>;
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(record["deployments"])
      ? record["deployments"]
      : [];
  let latest = 0;
  for (const entry of raw) {
    if (entry == null || typeof entry !== "object") continue;
    const deployment = entry as VercelDeploymentLike;
    const createdAt = deployment.createdAt;
    if (typeof createdAt === "number" && Number.isFinite(createdAt)) {
      latest = Math.max(latest, createdAt);
    } else if (typeof createdAt === "string") {
      const parsed = Date.parse(createdAt);
      if (!Number.isNaN(parsed)) latest = Math.max(latest, parsed);
    }
  }
  return {
    count: raw.length,
    latestAt: latest > 0 ? new Date(latest).toISOString() : null,
  };
}

export function extractVercelPausedUntil(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const team =
    record["team"] != null && typeof record["team"] === "object"
      ? (record["team"] as Record<string, unknown>)
      : record;
  for (const key of ["pausedUntil", "paused_until", "blockedUntil", "suspendedUntil"]) {
    const value = team[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }
  }
  return null;
}

/** Converte a unidade devolvida pela Vercel para a unidade canônica do painel. */
export function convertVercelValue(metricId: string, value: number, unit: string | null): number {
  if (!Number.isFinite(value)) return value;
  const normalized = (unit ?? "").toLowerCase().replace(/\s+/g, "");

  const isByteMetric =
    metricId === "fastOriginTransfer" ||
    metricId === "fastDataTransfer" ||
    metricId === "deploymentStorage";
  if (isByteMetric) {
    if (normalized.includes("tib") || normalized.includes("terabyte")) return value * 1024 ** 4;
    if (
      normalized.includes("gib") ||
      normalized.includes("gb") ||
      normalized.includes("gigabyte")
    ) {
      return value * 1024 ** 3;
    }
    if (
      normalized.includes("mib") ||
      normalized.includes("mb") ||
      normalized.includes("megabyte")
    ) {
      return value * 1024 ** 2;
    }
    if (
      normalized.includes("kib") ||
      normalized.includes("kb") ||
      normalized.includes("kilobyte")
    ) {
      return value * 1024;
    }
    return value;
  }

  if (metricId === "fluidActiveCpu") {
    if (normalized.includes("ms") || normalized.includes("millisecond")) return value / 3_600_000;
    if (normalized.includes("second") || normalized === "s") return value / 3_600;
    if (normalized.includes("minute") || normalized === "min") return value / 60;
    return value;
  }

  return value;
}
