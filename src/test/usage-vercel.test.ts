import { describe, expect, it } from "vitest";
import {
  convertVercelValue,
  extractFocusUsage,
  extractVercelPausedUntil,
  extractVercelUsage,
  parseVercelDeployments,
  parseVercelProjects,
} from "@/lib/usage/vercel-parse";

const GIB = 1024 ** 3;

describe("leitura de uso da Vercel", () => {
  it("extrai métricas do formato legado com objeto usage", () => {
    const parsed = extractVercelUsage({
      metrics: {
        fast_origin_transfer: { usage: 5_000_000_000, unit: "byte" },
        edge_requests: { usage: 610_000 },
        active_cpu: { usage: 2.4, unit: "hour" },
      },
    });
    expect(parsed.values["fastOriginTransfer"]?.value).toBe(5_000_000_000);
    expect(parsed.values["cdnRequests"]?.value).toBe(610_000);
    expect(parsed.values["fluidActiveCpu"]?.value).toBe(2.4);
  });

  it("extrai do formato FOCUS (/billing/charges) e converte unidades", () => {
    const parsed = extractFocusUsage({
      data: [
        {
          ChargeDescription: "Fast Origin Transfer",
          ConsumedQuantity: 9,
          ConsumedUnit: "gigabyte",
        },
        { ChargeDescription: "CDN Requests", ConsumedQuantity: 120_000, ConsumedUnit: "request" },
        { ChargeDescription: "Fluid Active CPU", ConsumedQuantity: 90, ConsumedUnit: "minute" },
      ],
    });
    expect(parsed.values["fastOriginTransfer"]?.value).toBe(9);
    expect(parsed.values["cdnRequests"]?.value).toBe(120_000);
    expect(parsed.values["fluidActiveCpu"]?.value).toBe(90);

    expect(convertVercelValue("fastOriginTransfer", 9, "gigabyte")).toBe(9 * GIB);
    expect(convertVercelValue("fluidActiveCpu", 90, "minute")).toBe(1.5);
    expect(convertVercelValue("cdnRequests", 120_000, "request")).toBe(120_000);
  });

  it("projetos e deploys", () => {
    const projects = parseVercelProjects({
      projects: [
        {
          id: "prj_1",
          name: "ongraph-site",
          latestDeployments: [{ readyState: "READY" }],
        },
        { id: "prj_2", name: "ontoom-devkit" },
      ],
    });
    expect(projects.projects).toHaveLength(2);
    expect(projects.projects[0]?.state).toBe("READY");

    const deployments = parseVercelDeployments({
      deployments: [
        { uid: "d1", createdAt: 1_700_000_000_000 },
        { uid: "d2", createdAt: 1_800_000_000_000 },
      ],
    });
    expect(deployments.count).toBe(2);
    expect(deployments.latestAt).toBe(new Date(1_800_000_000_000).toISOString());
  });

  it("lê a data de pausa quando a API expõe", () => {
    expect(extractVercelPausedUntil({ team: { pausedUntil: "2026-12-19T00:00:00.000Z" } })).toBe(
      "2026-12-19T00:00:00.000Z",
    );
    expect(extractVercelPausedUntil({ id: "team_x" })).toBeNull();
  });
});
