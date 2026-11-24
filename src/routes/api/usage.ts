import { createFileRoute } from "@tanstack/react-router";

/**
 * GET /api/usage — JSON agregado de cotas free.
 * Tokens e chamadas às APIs ficam só no servidor. Se USAGE_DASHBOARD_KEY estiver
 * definido, exige o header `x-usage-key` para o endpoint não ficar público.
 */
export const Route = createFileRoute("/api/usage")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { getEnv } = await import("@/lib/usage/env.server");
        const requiredKey = getEnv("USAGE_DASHBOARD_KEY");
        if (requiredKey != null) {
          const provided = request.headers.get("x-usage-key");
          if (provided !== requiredKey) {
            return Response.json(
              { error: "unauthorized" },
              { status: 401, headers: { "cache-control": "no-store" } },
            );
          }
        }

        const { getCachedUsageReport } = await import("@/lib/usage/report.server");
        const report = await getCachedUsageReport();
        return Response.json(report, {
          headers: {
            "cache-control": "no-store",
            "content-type": "application/json; charset=utf-8",
          },
        });
      },
    },
  },
});
