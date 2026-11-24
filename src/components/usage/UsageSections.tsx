import { AlertTriangle, CheckCircle2, Cloud, Globe, Server } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime, formatMetricValue, formatPercent, formatTime } from "@/lib/usage/format";
import type {
  CloudflareSection,
  HttpSection,
  QuotaAlert,
  RenderSection,
  VercelSection,
} from "@/lib/usage/types";
import { cn } from "@/lib/utils";
import { EmptyHint, MetricList, ProviderCard } from "./ProviderCard";
import { QuotaMeter } from "./QuotaMeter";

export function NearLimitPanel({ alerts }: { alerts: QuotaAlert[] }) {
  if (alerts.length === 0) {
    return (
      <section className="panel flex items-center gap-3 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <div>
          <p className="text-sm font-medium">Nenhuma cota em 70% ou mais</p>
          <p className="text-xs text-muted-foreground">
            Tudo abaixo do limiar de atenção no momento desta consulta.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel space-y-3 border-warning/40 p-4 glow-up">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4 text-warning" />
        <h2 className="text-sm font-semibold">Perto do limite</h2>
      </div>
      <ul className="space-y-2">
        {alerts.map((alert) => (
          <li
            key={`${alert.provider}-${alert.metricId}`}
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                alert.level === "critical"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-warning/15 text-warning",
              )}
            >
              {alert.level === "critical" ? "crítico" : "atenção"}
            </span>
            <span className="font-medium">{alert.provider}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{alert.label}</span>
            <span className="font-mono text-xs tabular">{formatPercent(alert.percent)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CloudflareCard({ section }: { section: CloudflareSection }) {
  return (
    <ProviderCard
      title="Cloudflare Workers"
      subtitle="Conta orlandoneto23 · limite free de 100.000 requests/dia"
      icon={<Cloud />}
      state={section.state}
      message={section.message}
      right={
        section.resetAt ? (
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            reset {formatTime(section.resetAt)} UTC
          </span>
        ) : null
      }
    >
      <MetricList>
        {section.metrics.map((metric) => (
          <QuotaMeter key={metric.id} metric={metric} />
        ))}
      </MetricList>

      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Por Worker (todos entram na cota)
        </h3>
        {section.workers.length === 0 ? (
          <EmptyHint>
            {section.state === "no_credentials" || section.state === "error"
              ? "Sem dados de Workers até a credencial funcionar."
              : "Nenhuma invocação registrada nesta janela."}
          </EmptyHint>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead className="text-right">Requests</TableHead>
                <TableHead className="text-right">Erros</TableHead>
                <TableHead className="text-right">Subrequests</TableHead>
                <TableHead className="text-right">CPU</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.workers.map((worker) => (
                <TableRow key={worker.scriptName}>
                  <TableCell className="max-w-[16rem] truncate font-mono text-xs">
                    {worker.scriptName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">
                    {formatMetricValue(worker.requests, "requests")}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-mono text-xs tabular",
                      worker.errors > 0 && "text-destructive",
                    )}
                  >
                    {formatMetricValue(worker.errors, "count")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">
                    {formatMetricValue(worker.subrequests, "count")}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">
                    {worker.cpuTimeMs == null ? "—" : formatMetricValue(worker.cpuTimeMs, "ms")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </ProviderCard>
  );
}

export function VercelCard({ section }: { section: VercelSection }) {
  return (
    <ProviderCard
      title="Vercel Hobby"
      subtitle="Team orlandonetos-projects · janela rolante de 30 dias"
      icon={<Globe />}
      state={section.state}
      message={section.message}
      right={
        section.pausedUntil ? (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-warning">
            pausado até {formatDateTime(section.pausedUntil)}
          </span>
        ) : null
      }
    >
      <MetricList>
        {section.metrics.map((metric) => (
          <QuotaMeter key={metric.id} metric={metric} />
        ))}
      </MetricList>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Projetos
          </h3>
          {section.projects.length === 0 ? (
            <EmptyHint>Nenhum projeto listado (sem credencial ou API indisponível).</EmptyHint>
          ) : (
            <ul className="space-y-1.5">
              {section.projects.map((project) => (
                <li key={project.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-mono text-xs">{project.name}</span>
                  {project.state && (
                    <span className="shrink-0 font-mono text-[10px] uppercase text-muted-foreground">
                      {project.state}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            Deploys na última consulta:{" "}
            <span className="font-mono text-foreground">{section.deploymentCount ?? "—"}</span>
          </p>
          <p>
            Último deploy:{" "}
            <span className="font-mono text-foreground">
              {formatDateTime(section.latestDeploymentAt)}
            </span>
          </p>
          <p>
            Fonte de uso:{" "}
            <span className="font-mono text-foreground">
              {section.usageSource ?? "indisponível"}
            </span>
          </p>
        </div>
      </div>
    </ProviderCard>
  );
}

export function RenderCard({ section }: { section: RenderSection }) {
  return (
    <ProviderCard
      title="Backend · Render"
      subtitle="VenomID API (free) · horas/bandwidth não publicados pela API"
      icon={<Server />}
      state={section.state}
      message={section.message}
    >
      <MetricList>
        {section.metrics.map((metric) => (
          <QuotaMeter key={metric.id} metric={metric} />
        ))}
      </MetricList>

      <div className="space-y-2">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Serviços
        </h3>
        {section.services.length === 0 ? (
          <EmptyHint>
            Sem RENDER_API_KEY, use o ping em “Checagens HTTP” para acompanhar a API VenomID.
          </EmptyHint>
        ) : (
          <ul className="space-y-1.5">
            {section.services.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 truncate font-mono text-xs">{service.name}</span>
                {service.type && (
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {service.type}
                  </span>
                )}
                {service.status && (
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {service.status}
                  </span>
                )}
                {service.url && (
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-xs text-primary underline"
                  >
                    abrir
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProviderCard>
  );
}

export function HttpCard({ section }: { section: HttpSection }) {
  const okCount = section.results.filter((result) => result.ok).length;
  const allOk = section.results.length > 0 && okCount === section.results.length;
  return (
    <ProviderCard
      title="Checagens HTTP (status real)"
      subtitle="Feitas pelo servidor, sem no-cors · timeout curto + 1 retry"
      icon={<Globe />}
      state={allOk ? "live" : "partial"}
      right={
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          {okCount}/{section.results.length} ok
        </span>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Alvo</TableHead>
            <TableHead>Esperado</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Latência</TableHead>
            <TableHead className="text-right">Resultado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.results.map((result) => (
            <TableRow key={result.id}>
              <TableCell>
                <div className="font-mono text-xs">{result.url.replace(/^https?:\/\//, "")}</div>
                {result.note && (
                  <div className="text-[10px] text-muted-foreground">{result.note}</div>
                )}
                {result.error && <div className="text-[10px] text-destructive">{result.error}</div>}
              </TableCell>
              <TableCell className="font-mono text-xs">{result.expected.join(" / ")}</TableCell>
              <TableCell
                className={cn(
                  "font-mono text-xs tabular",
                  result.ok ? "text-success" : "text-destructive",
                )}
              >
                {result.status ?? "—"}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular">
                {result.ms == null ? "—" : `${result.ms} ms`}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                    result.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
                  )}
                >
                  {result.ok ? "ok" : "falhou"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ProviderCard>
  );
}
