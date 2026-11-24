import { describe, expect, it } from "vitest";
import {
  collectAlerts,
  CRITICAL_PERCENT,
  quotaLevel,
  quotaPercent,
  summarizeAlerts,
  WARN_PERCENT,
} from "@/lib/usage/thresholds";
import type { QuotaMetric } from "@/lib/usage/types";

const metric = (overrides: Partial<QuotaMetric>): QuotaMetric => ({
  id: "m",
  label: "Métrica",
  used: 0,
  limit: 100,
  unit: "requests",
  period: "day",
  unavailable: false,
  note: null,
  ...overrides,
});

describe("motor de limiares 70/90", () => {
  it("calcula o percentual e trata limite inválido", () => {
    expect(quotaPercent(50, 100)).toBe(50);
    expect(quotaPercent(0, 100)).toBe(0);
    expect(quotaPercent(10, 0)).toBeNull();
    expect(quotaPercent(null, 100)).toBeNull();
    expect(quotaPercent(10, null)).toBeNull();
  });

  it("classifica abaixo de 70% como ok", () => {
    expect(quotaLevel(0)).toBe("ok");
    expect(quotaLevel(69.9)).toBe("ok");
    expect(quotaLevel(WARN_PERCENT - 0.01)).toBe("ok");
  });

  it("classifica 70% como atenção e 90% como crítico", () => {
    expect(quotaLevel(WARN_PERCENT)).toBe("warn");
    expect(quotaLevel(89.9)).toBe("warn");
    expect(quotaLevel(CRITICAL_PERCENT)).toBe("critical");
    expect(quotaLevel(100)).toBe("critical");
  });

  it("sem percentual é desconhecido", () => {
    expect(quotaLevel(null)).toBe("unknown");
  });
});

describe("resumo do que está perto do limite", () => {
  it("ignora ok e indisponível, e ordena o mais grave primeiro", () => {
    const alerts = summarizeAlerts([
      ...collectAlerts("Cloudflare", [
        metric({ id: "ok", used: 10 }),
        metric({ id: "warn", used: 75 }),
      ]),
      ...collectAlerts("Vercel", [
        metric({ id: "critical", used: 95 }),
        metric({ id: "unavailable", used: null, unavailable: true }),
      ]),
    ]);

    expect(alerts.map((alert) => alert.metricId)).toEqual(["critical", "warn"]);
    expect(alerts[0]?.level).toBe("critical");
  });

  it("não alerta quando não há limite", () => {
    expect(collectAlerts("Render", [metric({ used: 999, limit: null })])).toEqual([]);
  });
});
