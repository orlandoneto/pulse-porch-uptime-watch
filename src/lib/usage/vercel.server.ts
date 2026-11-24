import { getEnv } from "./env.server";
import type { QuotaMetric, VercelProject, VercelSection } from "./types";
import {
  convertVercelValue,
  extractFocusUsage,
  extractVercelPausedUntil,
  extractVercelUsage,
  parseVercelDeployments,
  parseVercelProjects,
  type VercelUsageResult,
} from "./vercel-parse";

const API = "https://api.vercel.com";
const DEFAULT_TEAM_ID = "team_8hfXyjRokDDYZINiTRPMpw6K";
const GIB = 1024 ** 3;
const USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

interface MetricSeed {
  id: string;
  label: string;
  limit: number | null;
  unit: QuotaMetric["unit"];
  note: string;
}

const METRIC_SEEDS: MetricSeed[] = [
  {
    id: "vercel-fast-origin-transfer",
    label: "Fast Origin Transfer (30 dias)",
    limit: 10 * GIB,
    unit: "bytes",
    note: "Limite Hobby: 10 GB.",
  },
  {
    id: "vercel-fast-data-transfer",
    label: "Fast Data Transfer (30 dias)",
    limit: 100 * GIB,
    unit: "bytes",
    note: "Limite Hobby: 100 GB.",
  },
  {
    id: "vercel-cdn-requests",
    label: "CDN / Edge requests (30 dias)",
    limit: 1_000_000,
    unit: "requests",
    note: "Limite Hobby: 1 milhão.",
  },
  {
    id: "vercel-isr-writes",
    label: "ISR Writes (30 dias)",
    limit: 200_000,
    unit: "count",
    note: "Teto de referência do Hobby: 200 mil escritas.",
  },
  {
    id: "vercel-deployment-storage",
    label: "Deployment storage (30 dias)",
    limit: 10 * GIB,
    unit: "bytes",
    note: "Teto aproximado do Hobby: 10 GB.",
  },
  {
    id: "vercel-fluid-active-cpu",
    label: "Fluid Active CPU (30 dias)",
    limit: 4,
    unit: "hours",
    note: "Limite Hobby: 4 h de CPU.",
  },
  {
    id: "vercel-function-invocations",
    label: "Function invocations (30 dias)",
    limit: 1_000_000,
    unit: "requests",
    note: "Limite Hobby: 1 milhão de invocações.",
  },
];

const PARSER_IDS: Record<string, string> = {
  "vercel-fast-origin-transfer": "fastOriginTransfer",
  "vercel-fast-data-transfer": "fastDataTransfer",
  "vercel-cdn-requests": "cdnRequests",
  "vercel-isr-writes": "isrWrites",
  "vercel-deployment-storage": "deploymentStorage",
  "vercel-fluid-active-cpu": "fluidActiveCpu",
  "vercel-function-invocations": "functionInvocations",
};

function defaultMetrics(): QuotaMetric[] {
  return METRIC_SEEDS.map((seed) => ({
    id: seed.id,
    label: seed.label,
    used: null,
    limit: seed.limit,
    unit: seed.unit,
    period: "30d",
    unavailable: true,
    note: seed.note,
  }));
}

async function getJson(url: string, token: string, timeoutMs = 10_000): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function getOptionalJson(url: string, token: string): Promise<unknown | null> {
  try {
    return await getJson(url, token);
  } catch {
    return null;
  }
}

function mergeUsage(metricId: string, parsed: VercelUsageResult): number | null {
  const parserId = PARSER_IDS[metricId];
  if (!parserId) return null;
  const entry = parsed.values[parserId];
  if (!entry) return null;
  return convertVercelValue(parserId, entry.value, entry.unit);
}

async function fetchUsage(teamId: string, token: string, now: Date): Promise<VercelUsageResult> {
  const fromIso = new Date(now.getTime() - USAGE_WINDOW_MS).toISOString();
  const toIso = now.toISOString();
  const fromMs = String(now.getTime() - USAGE_WINDOW_MS);
  const toMs = String(now.getTime());

  const attempts: Array<{
    url: string;
    parse: (payload: unknown, source: string) => VercelUsageResult;
  }> = [
    {
      url: `${API}/v1/billing/charges?teamId=${encodeURIComponent(teamId)}&from=${fromIso}&to=${toIso}`,
      parse: (payload, source) => extractFocusUsage(payload, source),
    },
    {
      url: `${API}/v1/usage?teamId=${encodeURIComponent(teamId)}&from=${fromMs}&to=${toMs}`,
      parse: (payload, source) => extractVercelUsage(payload, source),
    },
    {
      url: `${API}/v2/usage?teamId=${encodeURIComponent(teamId)}&from=${fromMs}&to=${toMs}`,
      parse: (payload, source) => extractVercelUsage(payload, source),
    },
  ];

  for (const attempt of attempts) {
    try {
      const payload = await getJson(attempt.url, token);
      const source = new URL(attempt.url).pathname;
      const parsed = attempt.parse(payload, source);
      if (Object.keys(parsed.values).length > 0) return parsed;
    } catch {
      /* tenta o próximo formato sem expor o corpo/código */
    }
  }
  return { values: {}, source: null };
}

export async function getVercelSection(now = new Date()): Promise<VercelSection> {
  const token = getEnv("VERCEL_TOKEN");
  const teamId = getEnv("VERCEL_TEAM_ID") ?? DEFAULT_TEAM_ID;
  const base = {
    metrics: defaultMetrics(),
    projects: [] as VercelProject[],
    deploymentCount: null,
    latestDeploymentAt: null,
    pausedUntil: null,
    usageSource: null,
  };

  if (!token) {
    return {
      ...base,
      state: "no_credentials",
      message:
        "Crie VERCEL_TOKEN (somente leitura, time orlandonetos-projects) no .dev.vars para ver projetos, deploys e uso.",
    };
  }

  let failures = 0;
  let pausedUntil: string | null = null;

  const teamPayload = await getOptionalJson(`${API}/v2/teams/${encodeURIComponent(teamId)}`, token);
  if (teamPayload == null) failures += 1;
  else pausedUntil = extractVercelPausedUntil(teamPayload);

  const projectsPayload = await getOptionalJson(
    `${API}/v9/projects?teamId=${encodeURIComponent(teamId)}&limit=100`,
    token,
  );
  if (projectsPayload == null) failures += 1;
  const projects = parseVercelProjects(projectsPayload).projects;

  const deploymentsPayload = await getOptionalJson(
    `${API}/v6/deployments?teamId=${encodeURIComponent(teamId)}&limit=20`,
    token,
  );
  if (deploymentsPayload == null) failures += 1;
  const deployments = parseVercelDeployments(deploymentsPayload);

  const usage = await fetchUsage(teamId, token, now);
  const usageCount = Object.keys(usage.values).length;
  if (usageCount === 0) failures += 1;

  if (failures >= 4 && projects.length === 0) {
    return {
      ...base,
      state: "error",
      message: "A Vercel recusou as consultas (token sem permissão ou API indisponível).",
    };
  }

  const metrics = defaultMetrics().map((metric) => {
    const used = mergeUsage(metric.id, usage);
    if (used == null) return metric;
    return { ...metric, used, unavailable: false };
  });

  const notes: string[] = [];
  if (usageCount === 0) {
    notes.push("A API do Hobby não retornou uso/billing; o painel mostra projetos e deploys.");
  }
  if (pausedUntil) {
    notes.push(`Conta pausada até ${pausedUntil} (informado pela API).`);
  } else {
    notes.push("A API não expôs a pausa da conta; confira o status no painel da Vercel.");
  }

  return {
    state: usageCount > 0 ? "live" : "partial",
    message: notes.join(" "),
    metrics,
    projects,
    deploymentCount: deployments.count,
    latestDeploymentAt: deployments.latestAt,
    pausedUntil,
    usageSource: usage.source,
  };
}
