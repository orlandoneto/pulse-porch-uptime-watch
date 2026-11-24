import { describe, expect, it } from "vitest";
import { evaluateHttpResult, HTTP_TARGETS, isExpectedStatus } from "@/lib/usage/http";

const target = (id: string) => {
  const found = HTTP_TARGETS.find((entry) => entry.id === id);
  if (!found) throw new Error(`alvo ausente: ${id}`);
  return found;
};

describe("status HTTP esperado", () => {
  it("aceita 200 na www", () => {
    expect(isExpectedStatus(200, [200])).toBe(true);
    expect(isExpectedStatus(301, [200])).toBe(false);
  });

  it("aceita apenas 301 no apex do ON Graph", () => {
    const apex = target("ongraph-apex");
    expect(evaluateHttpResult(apex, 301, 120).ok).toBe(true);
    expect(evaluateHttpResult(apex, 200, 120).ok).toBe(false);
    expect(evaluateHttpResult(apex, 308, 120).ok).toBe(false);
  });

  it("a API VenomID pode aceitar qualquer 2xx", () => {
    const api = target("venomid-api");
    expect(evaluateHttpResult(api, 204, 90).ok).toBe(true);
    expect(evaluateHttpResult(api, 503, 90).ok).toBe(false);
  });

  it("sem status (timeout) não é sucesso", () => {
    const www = target("ongraph-www");
    const result = evaluateHttpResult(www, null, 8_000, "Tempo esgotado");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Tempo esgotado");
  });

  it("traz os 7 alvos do briefing", () => {
    expect(HTTP_TARGETS.map((entry) => entry.id)).toEqual([
      "ongraph-www",
      "ongraph-admin",
      "ongraph-editor",
      "ongraph-apex",
      "venomid-www",
      "ontoom",
      "venomid-api",
    ]);
  });
});
