import { evaluateHttpResult, HTTP_TARGETS, type HttpTarget } from "./http";
import type { HttpCheckResult, HttpSection } from "./types";

const TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attempt(target: HttpTarget): Promise<HttpCheckResult> {
  const started = Date.now();
  try {
    const response = await fetch(target.url, {
      method: "GET",
      // "manual" preserva o 301 do apex; seguir o redirect esconderia o status real.
      redirect: "manual",
      cache: "no-store",
      headers: { "user-agent": "OnWatch-Usage/1.0" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return evaluateHttpResult(target, response.status, Date.now() - started);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError" ? "Tempo esgotado" : "Sem resposta";
    return evaluateHttpResult(target, null, Date.now() - started, message);
  }
}

async function checkTarget(target: HttpTarget): Promise<HttpCheckResult> {
  const first = await attempt(target);
  if (first.ok) return first;
  // Um retry único evita alarme falso em cold start/soluço de rede.
  await sleep(RETRY_DELAY_MS);
  return attempt(target);
}

export async function getHttpSection(): Promise<HttpSection> {
  const results = await Promise.all(HTTP_TARGETS.map((target) => checkTarget(target)));
  return { checkedAt: new Date().toISOString(), results };
}
