import { getEnv, safeErrorMessage } from "./env.server";
import type { QuotaMetric, RenderSection, RenderService } from "./types";

const API = "https://api.render.com/v1";

function defaultMetrics(): QuotaMetric[] {
  return [
    {
      id: "render-hours",
      label: "Horas de instância (free, mês)",
      used: null,
      limit: null,
      unit: "hours",
      period: "month",
      unavailable: true,
      note: "A API do Render não publica o uso de horas do plano free.",
    },
    {
      id: "render-bandwidth",
      label: "Tráfego de saída (free, mês)",
      used: null,
      limit: null,
      unit: "bytes",
      period: "month",
      unavailable: true,
      note: "A API do Render não publica o bandwidth do plano free.",
    },
  ];
}

interface RenderServiceInner {
  id?: unknown;
  name?: unknown;
  type?: unknown;
  url?: unknown;
  serviceDetails?: { url?: unknown } | null;
  suspended?: unknown;
}

interface RenderServicePayload extends RenderServiceInner {
  service?: RenderServiceInner | null;
}

export function parseRenderServices(payload: unknown): RenderService[] {
  const raw = Array.isArray(payload)
    ? payload
    : payload != null &&
        typeof payload === "object" &&
        Array.isArray((payload as { services?: unknown }).services)
      ? ((payload as { services: unknown[] }).services as unknown[])
      : [];

  const services: RenderService[] = [];
  for (const entry of raw) {
    if (entry == null || typeof entry !== "object") continue;
    const wrapper = entry as RenderServicePayload;
    const service: RenderServiceInner = wrapper.service ?? wrapper;
    const id = service.id;
    if (typeof id !== "string") continue;
    const name = typeof service.name === "string" ? service.name : id;
    const type = typeof service.type === "string" ? service.type : null;
    const detailsUrl = service.serviceDetails?.url;
    const url =
      typeof detailsUrl === "string"
        ? detailsUrl
        : typeof service.url === "string"
          ? service.url
          : null;
    let status: string | null = null;
    if (typeof service.suspended === "boolean") {
      status = service.suspended ? "suspenso" : "ativo";
    }
    services.push({ id, name, type, url, status });
  }
  return services;
}

export async function getRenderSection(): Promise<RenderSection> {
  const token = getEnv("RENDER_API_KEY");
  const base = { metrics: defaultMetrics(), services: [] as RenderService[] };

  if (!token) {
    return {
      ...base,
      state: "no_credentials",
      message:
        "Opcional: crie RENDER_API_KEY (somente leitura) no .dev.vars para listar os serviços. O ping HTTP da API funciona sem token.",
    };
  }

  try {
    const response = await fetch(`${API}/services?limit=100`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Render respondeu HTTP ${response.status}`);
    const payload: unknown = await response.json();
    const services = parseRenderServices(payload);
    return {
      state: "partial",
      message:
        "Serviços listados. Horas e bandwidth do free tier não são publicados pela API do Render; use o ping HTTP para a disponibilidade.",
      metrics: base.metrics,
      services,
    };
  } catch (error) {
    return {
      ...base,
      state: "error",
      message: `Não foi possível consultar o Render: ${safeErrorMessage(error)}`,
    };
  }
}
