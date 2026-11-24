import { parseCloudflareGraphql, aggregateWorkers } from "./aggregate";
import { getEnv, safeErrorMessage } from "./env.server";
import type { CloudflareSection, QuotaMetric, WorkerUsage } from "./types";

const GRAPHQL_URL = "https://api.cloudflare.com/client/v4/graphql";
const DEFAULT_ACCOUNT_ID = "656b85e95fc91fd706694e2ad9411af7";
export const CLOUDFLARE_DAILY_LIMIT = 100_000;

const QUERY = `query OnWatchWorkersUsage($accountTag: string, $start: string, $end: string) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersInvocationsAdaptive(
        limit: 1000
        filter: { datetime_geq: $start, datetime_leq: $end }
      ) {
        dimensions {
          scriptName
        }
        sum {
          requests
          errors
          subrequests
          cpuTimeUs
        }
      }
    }
  }
}`;

export function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
}

export function nextUtcMidnight(now: Date): Date {
  const start = startOfUtcDay(now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

function baseMetrics(): QuotaMetric[] {
  return [
    {
      id: "cf-requests",
      label: "Requisições hoje (todos os Workers)",
      used: null,
      limit: CLOUDFLARE_DAILY_LIMIT,
      unit: "requests",
      period: "day",
      unavailable: false,
      note: "Reset às 00:00 UTC. Todos os Workers entram na mesma cota.",
    },
    {
      id: "cf-errors",
      label: "Erros hoje",
      used: null,
      limit: null,
      unit: "count",
      period: "day",
      unavailable: true,
      note: "Precisa de CLOUDFLARE_API_TOKEN para consultar.",
    },
  ];
}

export async function getCloudflareSection(now = new Date()): Promise<CloudflareSection> {
  const token = getEnv("CLOUDFLARE_API_TOKEN");
  const accountId = getEnv("CLOUDFLARE_ACCOUNT_ID") ?? DEFAULT_ACCOUNT_ID;
  const windowStart = startOfUtcDay(now);
  const resetAt = nextUtcMidnight(now);
  const common = {
    workers: [] as WorkerUsage[],
    totalRequests: null,
    totalErrors: null,
    totalCpuTimeMs: null,
    dailyLimit: CLOUDFLARE_DAILY_LIMIT,
    windowStart: windowStart.toISOString(),
    resetAt: resetAt.toISOString(),
  };

  if (!token) {
    return {
      ...common,
      state: "no_credentials",
      message:
        "Crie CLOUDFLARE_API_TOKEN (somente leitura, Account Analytics: Read) no .dev.vars para ver o uso diário.",
      metrics: baseMetrics(),
    };
  }

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          accountTag: accountId,
          start: windowStart.toISOString(),
          end: now.toISOString(),
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Cloudflare GraphQL respondeu HTTP ${response.status}`);

    const rows = parseCloudflareGraphql(payload);
    const totals = aggregateWorkers(rows);
    const metrics: QuotaMetric[] = [
      {
        id: "cf-requests",
        label: "Requisições hoje (todos os Workers)",
        used: totals.totalRequests,
        limit: CLOUDFLARE_DAILY_LIMIT,
        unit: "requests",
        period: "day",
        unavailable: false,
        note: "Reset às 00:00 UTC. Todos os Workers entram na mesma cota.",
      },
      {
        id: "cf-errors",
        label: "Erros hoje",
        used: totals.totalErrors,
        limit: null,
        unit: "count",
        period: "day",
        unavailable: false,
        note: null,
      },
      {
        id: "cf-cpu",
        label: "CPU total hoje",
        used: totals.totalCpuTimeMs,
        limit: null,
        unit: "ms",
        period: "day",
        unavailable: totals.totalCpuTimeMs == null,
        note:
          totals.totalCpuTimeMs == null
            ? "A API não retornou cpuTimeUs para esta janela."
            : "Soma de cpuTimeUs convertida para ms. O limite free é 10 ms de CPU por request.",
      },
    ];

    return {
      state: "live",
      message: totals.workers.length === 0 ? "Nenhuma invocação registrada na janela atual." : null,
      metrics,
      workers: totals.workers,
      totalRequests: totals.totalRequests,
      totalErrors: totals.totalErrors,
      totalCpuTimeMs: totals.totalCpuTimeMs,
      dailyLimit: CLOUDFLARE_DAILY_LIMIT,
      windowStart: windowStart.toISOString(),
      resetAt: resetAt.toISOString(),
    };
  } catch (error) {
    return {
      ...common,
      state: "error",
      message: `Não foi possível consultar o Cloudflare: ${safeErrorMessage(error)}`,
      metrics: baseMetrics(),
    };
  }
}
