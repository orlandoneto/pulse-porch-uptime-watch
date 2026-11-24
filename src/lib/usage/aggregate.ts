import type { WorkerUsage } from "./types";

/** Linha já normalizada de `workersInvocationsAdaptive` (cpu em ms). */
export interface CloudflareRow {
  scriptName: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuTimeMs: number | null;
}

export interface CloudflareTotals {
  workers: WorkerUsage[];
  totalRequests: number;
  totalErrors: number;
  totalSubrequests: number;
  totalCpuTimeMs: number | null;
}

function toFinite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Soma por Worker mesmo que o GraphQL devolva mais de uma linha por script
 * (por exemplo, quebrado por `datetime` ou `status`). O total geral é sempre a
 * soma das linhas, nunca um número separado — é ele que compara com 100k/dia.
 */
export function aggregateWorkers(rows: CloudflareRow[]): CloudflareTotals {
  const byScript = new Map<string, WorkerUsage>();
  let totalCpuTimeMs: number | null = null;

  for (const row of rows) {
    const scriptName = row.scriptName.trim() || "(sem nome)";
    const current = byScript.get(scriptName) ?? {
      scriptName,
      requests: 0,
      errors: 0,
      subrequests: 0,
      cpuTimeMs: null,
    };
    current.requests += toFinite(row.requests);
    current.errors += toFinite(row.errors);
    current.subrequests += toFinite(row.subrequests);
    if (row.cpuTimeMs != null && Number.isFinite(row.cpuTimeMs)) {
      current.cpuTimeMs = (current.cpuTimeMs ?? 0) + row.cpuTimeMs;
      totalCpuTimeMs = (totalCpuTimeMs ?? 0) + row.cpuTimeMs;
    }
    byScript.set(scriptName, current);
  }

  const workers = [...byScript.values()].sort((a, b) => b.requests - a.requests);
  return {
    workers,
    totalRequests: workers.reduce((sum, worker) => sum + worker.requests, 0),
    totalErrors: workers.reduce((sum, worker) => sum + worker.errors, 0),
    totalSubrequests: workers.reduce((sum, worker) => sum + worker.subrequests, 0),
    totalCpuTimeMs,
  };
}

interface CloudflareGraphqlNode {
  sum?: {
    requests?: unknown;
    errors?: unknown;
    subrequests?: unknown;
    cpuTimeUs?: unknown;
  } | null;
  dimensions?: {
    scriptName?: unknown;
  } | null;
}

interface CloudflareGraphqlPayload {
  data?: {
    viewer?: {
      accounts?: Array<{
        workersInvocationsAdaptive?: CloudflareGraphqlNode[] | null;
      }> | null;
    } | null;
  } | null;
  errors?: Array<{ message?: unknown }> | null;
}

/**
 * Converte a resposta crua do GraphQL para linhas simples. É tolerante a
 * payloads inesperados: qualquer coisa inválida vira lista vazia, para a tela
 * mostrar "sem dados" em vez de quebrar.
 */
export function parseCloudflareGraphql(payload: unknown): CloudflareRow[] {
  if (payload == null || typeof payload !== "object") return [];
  const root = payload as CloudflareGraphqlPayload;
  if (root.errors != null && root.errors.length > 0) {
    const first = root.errors[0]?.message;
    if (typeof first === "string" && first.trim()) throw new Error(first);
  }

  const accounts = root.data?.viewer?.accounts;
  if (!Array.isArray(accounts)) return [];

  const rows: CloudflareRow[] = [];
  for (const account of accounts) {
    const nodes = account?.workersInvocationsAdaptive;
    if (!Array.isArray(nodes)) continue;
    for (const node of nodes) {
      if (node == null) continue;
      const scriptName = node.dimensions?.scriptName;
      const cpuTimeUs = node.sum?.cpuTimeUs;
      rows.push({
        scriptName: typeof scriptName === "string" ? scriptName : "",
        requests: toFinite(node.sum?.requests),
        errors: toFinite(node.sum?.errors),
        subrequests: toFinite(node.sum?.subrequests),
        cpuTimeMs:
          typeof cpuTimeUs === "number" && Number.isFinite(cpuTimeUs) ? cpuTimeUs / 1000 : null,
      });
    }
  }
  return rows;
}
