import { getCloudflareSection, CLOUDFLARE_DAILY_LIMIT } from "./cloudflare.server";
import { getEnv, hasEnv, safeErrorMessage } from "./env.server";
import { getHttpSection } from "./http.server";
import { getRenderSection } from "./render.server";
import { collectAlerts, summarizeAlerts } from "./thresholds";
import type { CloudflareSection, RenderSection, UsageReport, VercelSection } from "./types";
import { getVercelSection } from "./vercel.server";

function emptyCloudflare(message: string): CloudflareSection {
  return {
    state: "error",
    message,
    metrics: [],
    workers: [],
    totalRequests: null,
    totalErrors: null,
    totalCpuTimeMs: null,
    dailyLimit: CLOUDFLARE_DAILY_LIMIT,
    windowStart: null,
    resetAt: null,
  };
}

function emptyVercel(message: string): VercelSection {
  return {
    state: "error",
    message,
    metrics: [],
    projects: [],
    deploymentCount: null,
    latestDeploymentAt: null,
    pausedUntil: null,
    usageSource: null,
  };
}

function emptyRender(message: string): RenderSection {
  return { state: "error", message, metrics: [], services: [] };
}

async function safe<T>(run: () => Promise<T>, fallback: (message: string) => T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    return fallback(`Falha inesperada ao consultar o provedor: ${safeErrorMessage(error)}`);
  }
}

export async function buildUsageReport(): Promise<UsageReport> {
  const [cloudflare, vercel, render, http] = await Promise.all([
    safe(() => getCloudflareSection(), emptyCloudflare),
    safe(() => getVercelSection(), emptyVercel),
    safe(() => getRenderSection(), emptyRender),
    getHttpSection(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    cloudflare,
    vercel,
    render,
    http,
    nearLimit: summarizeAlerts([
      ...collectAlerts("Cloudflare", cloudflare.metrics),
      ...collectAlerts("Vercel", vercel.metrics),
      ...collectAlerts("Render", render.metrics),
    ]),
    credentials: {
      cloudflare: hasEnv("CLOUDFLARE_API_TOKEN"),
      vercel: hasEnv("VERCEL_TOKEN"),
      render: hasEnv("RENDER_API_KEY"),
    },
  };
}

const CACHE_TTL_MS = 15_000;
let cache: { at: number; report: UsageReport } | null = null;

/**
 * Cache curto em memória para duas requisições próximas (ex.: SSR + hidratação)
 * não gastarem a cota diária de 100k do próprio OnWatch. `force` ignora o cache
 * no botão "Atualizar".
 */
export async function getCachedUsageReport(
  options: { force?: boolean } = {},
): Promise<UsageReport> {
  const now = Date.now();
  if (!options.force && cache != null && now - cache.at < CACHE_TTL_MS) return cache.report;
  const report = await buildUsageReport();
  cache = { at: now, report };
  return report;
}

/** Só para o teste/depuração: confirma se a env existe sem imprimir o valor. */
export function usageEnvPresence(): Record<string, boolean> {
  return {
    CLOUDFLARE_API_TOKEN: getEnv("CLOUDFLARE_API_TOKEN") != null,
    VERCEL_TOKEN: getEnv("VERCEL_TOKEN") != null,
    RENDER_API_KEY: getEnv("RENDER_API_KEY") != null,
    USAGE_DASHBOARD_KEY: getEnv("USAGE_DASHBOARD_KEY") != null,
  };
}
