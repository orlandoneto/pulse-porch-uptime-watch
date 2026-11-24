type EnvBag = Record<string, unknown>;

function envBags(): EnvBag[] {
  const globalObject = globalThis as unknown as {
    __env__?: EnvBag;
    process?: { env?: EnvBag };
  };
  const bags: EnvBag[] = [];
  if (globalObject.__env__ != null) bags.push(globalObject.__env__);
  if (globalObject.process?.env != null) bags.push(globalObject.process.env);
  return bags;
}

/** Lê uma variável só no servidor. Nunca use este módulo em código do cliente. */
export function getEnv(name: string): string | undefined {
  for (const bag of envBags()) {
    const raw = bag[name];
    if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
  }
  return undefined;
}

export function hasEnv(name: string): boolean {
  return getEnv(name) != null;
}

/** Mensagem curta e sem segredo para mostrar no card em caso de falha. */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message.replace(/Bearer\s+\S+/gi, "Bearer [oculto]").slice(0, 220);
  }
  return "Falha ao consultar a API";
}
