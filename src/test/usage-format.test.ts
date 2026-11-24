import { describe, expect, it } from "vitest";
import { formatBytes, formatMetricValue, formatPercent } from "@/lib/usage/format";

describe("formatação do painel", () => {
  it("formata requests grandes em mil/mi", () => {
    expect(formatMetricValue(72_500, "requests")).toBe("72,5 mil");
    expect(formatMetricValue(1_500_000, "requests")).toBe("1,5 mi");
    expect(formatMetricValue(999, "count")).toBe("999");
  });

  it("formata bytes em GB/MB", () => {
    expect(formatBytes(1024 ** 3)).toBe("1,00 GB");
    expect(formatBytes(10 * 1024 ** 3)).toBe("10,00 GB");
    expect(formatBytes(512 * 1024 ** 2)).toBe("512,0 MB");
  });

  it("formata percentual com uma casa quando precisa", () => {
    expect(formatPercent(70)).toBe("70%");
    expect(formatPercent(72.5)).toBe("72,5%");
    expect(formatPercent(null)).toBe("—");
  });

  it("valor ausente vira travessão", () => {
    expect(formatMetricValue(null, "bytes")).toBe("—");
  });
});
