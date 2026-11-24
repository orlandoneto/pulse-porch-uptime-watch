import { createServerFn } from "@tanstack/react-start";

/**
 * Server function usada pela tela /uso. O serviço pesado é importado só dentro
 * do handler para o bundle do cliente nunca tocar em tokens/env do servidor.
 */
export const getUsageReport = createServerFn({ method: "GET" })
  .validator((data: { force?: boolean } | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const { getCachedUsageReport } = await import("./report.server");
    return getCachedUsageReport({ force: data.force === true });
  });
