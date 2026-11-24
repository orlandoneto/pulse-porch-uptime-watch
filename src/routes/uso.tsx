import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Gauge, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CloudflareCard,
  HttpCard,
  NearLimitPanel,
  RenderCard,
  VercelCard,
} from "@/components/usage/UsageSections";
import { getUsageReport } from "@/lib/usage/api";
import { formatDateTime, formatPercent } from "@/lib/usage/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/uso")({
  head: () => ({
    meta: [
      { title: "Uso / Cotas — OnWatch" },
      {
        name: "description",
        content:
          "Acompanhe o uso das cotas free de Cloudflare Workers, Vercel Hobby, Render e checagens HTTP antes de estourar.",
      },
      { property: "og:title", content: "Uso / Cotas — OnWatch" },
      { property: "og:description", content: "Cotas free com avisos em 70% e 90%." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsagePage,
});

function UsagePage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["usage-report"],
    queryFn: () => getUsageReport({ data: { force: false } }),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const [refreshing, setRefreshing] = useState(false);
  const warned = useRef(false);

  const report = query.data;

  useEffect(() => {
    if (!report || warned.current || report.nearLimit.length === 0) return;
    warned.current = true;
    const top = report.nearLimit[0];
    if (!top) return;
    toast.warning("Cota perto do limite", {
      description: `${top.provider}: ${top.label} em ${formatPercent(top.percent)}`,
      duration: 8000,
    });
  }, [report]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await getUsageReport({ data: { force: true } });
      queryClient.setQueryData(["usage-report"], fresh);
    } catch {
      toast.error("Não foi possível atualizar agora");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Monitoramento
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            <Gauge className="size-6 text-primary" /> Uso / Cotas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Cotas grátis com aviso em 70% (atenção) e 90% (crítico). Os tokens ficam só no servidor;
            esta tela é a exceção documentada ao uptime que roda no navegador.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" className="bg-surface" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn(refreshing && "animate-spin")} />
            {refreshing ? "Atualizando…" : "Atualizar agora"}
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            atualizado em {formatDateTime(report?.generatedAt ?? null)}
          </span>
        </div>
      </div>

      {report && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          <CredentialChip label="Cloudflare" ok={report.credentials.cloudflare} />
          <CredentialChip label="Vercel" ok={report.credentials.vercel} />
          <CredentialChip label="Render" ok={report.credentials.render} />
        </div>
      )}

      {query.isPending ? (
        <UsageSkeleton />
      ) : query.isError || !report ? (
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">Não foi possível carregar as cotas</h2>
          <p className="text-sm text-muted-foreground">
            Confira se as variáveis do `.dev.vars` estão corretas e tente de novo.
          </p>
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn(refreshing && "animate-spin")} /> Tentar novamente
          </Button>
        </section>
      ) : (
        <>
          <NearLimitPanel alerts={report.nearLimit} />
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="xl:col-span-2">
              <CloudflareCard section={report.cloudflare} />
            </div>
            <VercelCard section={report.vercel} />
            <RenderCard section={report.render} />
            <div className="xl:col-span-2">
              <HttpCard section={report.http} />
            </div>
          </div>
          <p className="pb-4 text-center text-xs text-muted-foreground">
            O próprio OnWatch consome a cota diária de 100k do Cloudflare. As consultas têm cache
            curto e a checagem HTTP usa timeout de 8 s com um retry.
          </p>
        </>
      )}
    </div>
  );
}

function CredentialChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        ok ? "border-success/40 text-success" : "border-border text-muted-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", ok ? "bg-success" : "bg-muted-foreground")} />
      {label}: {ok ? "token ok" : "sem token"}
    </span>
  );
}

function UsageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20" />
      <Skeleton className="h-72" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
