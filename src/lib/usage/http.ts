import type { HttpCheckResult } from "./types";

export interface HttpTarget {
  id: string;
  url: string;
  /** Status exatos aceitos. O apex do ON Graph, por exemplo, precisa dar 301. */
  expected: readonly number[];
  /** Para APIs que podem responder 204 ou outro 2xx, aceitar qualquer sucesso. */
  okIf2xx?: boolean;
  note?: string;
}

/** Alvos do briefing. O servidor vê o status real; o uptime do cliente não vê. */
export const HTTP_TARGETS: readonly HttpTarget[] = [
  {
    id: "ongraph-www",
    url: "https://www.ongraph.com.br",
    expected: [200],
  },
  {
    id: "ongraph-admin",
    url: "https://admin.ongraph.com.br",
    expected: [200],
  },
  {
    id: "ongraph-editor",
    url: "https://editor.ongraph.com.br",
    expected: [200],
  },
  {
    id: "ongraph-apex",
    url: "https://ongraph.com.br",
    expected: [301],
    note: "Apex deve redirecionar para www (301).",
  },
  {
    id: "venomid-www",
    url: "https://www.venomid.com.br",
    expected: [200],
  },
  {
    id: "ontoom",
    url: "https://ontoom.com.br",
    expected: [200],
  },
  {
    id: "venomid-api",
    url: "https://venomid-api.onrender.com",
    expected: [200],
    okIf2xx: true,
    note: "Render free pode acordar devagar (cold start).",
  },
];

export function isExpectedStatus(
  status: number,
  expected: readonly number[],
  okIf2xx = false,
): boolean {
  if (expected.includes(status)) return true;
  return okIf2xx && status >= 200 && status < 300;
}

/** Resultado puro, sem rede — fácil de testar (301 no apex, 200 nos demais). */
export function evaluateHttpResult(
  target: HttpTarget,
  status: number | null,
  ms: number | null,
  error: string | null = null,
): HttpCheckResult {
  const ok = status != null && isExpectedStatus(status, target.expected, target.okIf2xx === true);
  return {
    id: target.id,
    url: target.url,
    expected: [...target.expected],
    status,
    ok,
    ms,
    error,
    note: target.note ?? null,
  };
}
