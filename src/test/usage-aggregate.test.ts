import { describe, expect, it } from "vitest";
import { aggregateWorkers, parseCloudflareGraphql } from "@/lib/usage/aggregate";

describe("agregação de Workers do Cloudflare", () => {
  it("soma requests por Worker e o total diário é a soma de todos", () => {
    const rows = parseCloudflareGraphql({
      data: {
        viewer: {
          accounts: [
            {
              workersInvocationsAdaptive: [
                {
                  dimensions: { scriptName: "ongraph-site-temp" },
                  sum: { requests: 40_000, errors: 3, subrequests: 8_000, cpuTimeUs: 2_400_000 },
                },
                {
                  dimensions: { scriptName: "ongraph-site-temp" },
                  sum: { requests: 10_000, errors: 1, subrequests: 2_000, cpuTimeUs: 600_000 },
                },
                {
                  dimensions: { scriptName: "pulse-porch-uptime-watch" },
                  sum: { requests: 20_000, errors: 0, subrequests: 2_000, cpuTimeUs: 1_200_000 },
                },
              ],
            },
          ],
        },
      },
      errors: null,
    });

    const totals = aggregateWorkers(rows);
    expect(totals.totalRequests).toBe(70_000);
    expect(totals.totalErrors).toBe(4);
    expect(totals.workers).toHaveLength(2);
    expect(totals.workers[0]?.scriptName).toBe("ongraph-site-temp");
    expect(totals.workers[0]?.requests).toBe(50_000);
    // cpuTimeUs -> ms
    expect(totals.workers[0]?.cpuTimeMs).toBe(3_000);
    expect(totals.totalCpuTimeMs).toBe(4_200);
  });

  it("tolera payload inválido e devolve lista vazia", () => {
    expect(parseCloudflareGraphql(null)).toEqual([]);
    expect(parseCloudflareGraphql({})).toEqual([]);
    expect(aggregateWorkers([]).totalRequests).toBe(0);
  });

  it("propaga erro do GraphQL sem inventar números", () => {
    expect(() =>
      parseCloudflareGraphql({ errors: [{ message: "permission denied" }], data: null }),
    ).toThrow("permission denied");
  });
});
