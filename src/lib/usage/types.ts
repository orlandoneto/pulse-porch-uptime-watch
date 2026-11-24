export type QuotaLevel = "ok" | "warn" | "critical" | "unknown";

export type QuotaUnit = "requests" | "bytes" | "count" | "hours" | "ms" | "percent";

export type QuotaPeriod = "day" | "30d" | "month";

export type SectionState = "live" | "partial" | "no_credentials" | "error" | "unavailable";

export interface QuotaMetric {
  id: string;
  label: string;
  used: number | null;
  limit: number | null;
  unit: QuotaUnit;
  period: QuotaPeriod;
  /** A API do provedor não publica este número. */
  unavailable: boolean;
  note: string | null;
}

export interface WorkerUsage {
  scriptName: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuTimeMs: number | null;
}

export interface CloudflareSection {
  state: SectionState;
  message: string | null;
  metrics: QuotaMetric[];
  workers: WorkerUsage[];
  totalRequests: number | null;
  totalErrors: number | null;
  totalCpuTimeMs: number | null;
  dailyLimit: number;
  windowStart: string | null;
  resetAt: string | null;
}

export interface VercelProject {
  id: string;
  name: string;
  state: string | null;
}

export interface VercelSection {
  state: SectionState;
  message: string | null;
  metrics: QuotaMetric[];
  projects: VercelProject[];
  deploymentCount: number | null;
  latestDeploymentAt: string | null;
  pausedUntil: string | null;
  usageSource: string | null;
}

export interface RenderService {
  id: string;
  name: string;
  type: string | null;
  url: string | null;
  status: string | null;
}

export interface RenderSection {
  state: SectionState;
  message: string | null;
  metrics: QuotaMetric[];
  services: RenderService[];
}

export interface HttpCheckResult {
  id: string;
  url: string;
  expected: number[];
  status: number | null;
  ok: boolean;
  ms: number | null;
  error: string | null;
  note: string | null;
}

export interface HttpSection {
  checkedAt: string;
  results: HttpCheckResult[];
}

export interface QuotaAlert {
  provider: string;
  metricId: string;
  label: string;
  percent: number;
  level: "warn" | "critical";
}

export interface UsageCredentials {
  cloudflare: boolean;
  vercel: boolean;
  render: boolean;
}

export interface UsageReport {
  generatedAt: string;
  cloudflare: CloudflareSection;
  vercel: VercelSection;
  render: RenderSection;
  http: HttpSection;
  nearLimit: QuotaAlert[];
  credentials: UsageCredentials;
}
