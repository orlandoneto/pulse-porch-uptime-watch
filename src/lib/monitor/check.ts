import type { CheckResult } from "./types";

async function once(url: string, timeoutMs: number): Promise<CheckResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = performance.now();
  try {
    // "no-cors" permite testar qualquer site pelo navegador: se o servidor
    // responder, a promessa resolve; se estiver fora do ar, ela falha.
    await fetch(url, { mode: "no-cors", cache: "no-store", redirect: "follow", signal: ctrl.signal });
    return { at: Date.now(), ok: true, ms: Math.round(performance.now() - start) };
  } catch {
    return {
      at: Date.now(),
      ok: false,
      ms: Math.round(performance.now() - start),
      error: ctrl.signal.aborted ? "Tempo esgotado" : "Sem resposta",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Testa a URL; em caso de falha tenta mais uma vez para evitar alarme falso. */
export async function checkUrl(url: string, timeoutSec: number): Promise<CheckResult> {
  const first = await once(url, timeoutSec * 1000);
  if (first.ok) return first;
  await new Promise((r) => setTimeout(r, 2500));
  return once(url, timeoutSec * 1000);
}
