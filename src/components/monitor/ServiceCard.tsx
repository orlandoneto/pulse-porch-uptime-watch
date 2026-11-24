import { ExternalLink, MoreHorizontal, Pause, Pencil, Play, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteService, updateService } from "@/lib/monitor/actions";
import { runCheck } from "@/lib/monitor/engine";
import { HISTORY_LIMIT, INTERVAL_OPTIONS, averageMs, uptimePercent } from "@/lib/monitor/logic";
import type { Service, ServiceRuntime } from "@/lib/monitor/types";
import { cn } from "@/lib/utils";
import { StatusPill } from "./StatusDot";
import { ago } from "./useNow";

interface Props {
  service: Service;
  runtime: ServiceRuntime | undefined;
  now: number;
  onEdit: (s: Service) => void;
}

export function ServiceCard({ service, runtime, now, onEdit }: Props) {
  const [busy, setBusy] = useState(false);
  const checks = runtime?.checks ?? [];
  const last = checks.at(-1);
  const status = service.paused ? "paused" : (runtime?.status ?? "unknown");
  const uptime = uptimePercent(checks);
  const avg = averageMs(checks);
  const interval = INTERVAL_OPTIONS.find((o) => o.value === service.intervalSec)?.label ?? `${service.intervalSec}s`;
  const host = safeHost(service.url);
  const slots = Array.from({ length: HISTORY_LIMIT }, (_, i) => checks[checks.length - HISTORY_LIMIT + i]);

  const checkNow = async () => {
    setBusy(true);
    await runCheck(service.id);
    setBusy(false);
  };

  return (
    <article
      className={cn(
        "panel flex flex-col gap-4 p-4 transition-colors",
        status === "up" && "glow-up",
        status === "down" && "glow-down border-destructive/40",
      )}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-foreground">{service.name}</h3>
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{host}</p>
        </div>
        <StatusPill status={status} />
        <Button variant="ghost" size="icon" className="-mt-1 size-8 shrink-0" asChild>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir ${service.name} em nova aba`}
            title="Abrir site"
          >
            <ExternalLink className="size-4" />
          </a>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 size-8" aria-label="Ações do site">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={checkNow}>
              <RefreshCw /> Verificar agora
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(service)}>
                  <Pencil /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => updateService(service.id, { paused: !service.paused })}>
                  {service.paused ? <Play /> : <Pause />} {service.paused ? "Retomar" : "Pausar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => {
                    if (confirm(`Remover ${service.name}?`)) deleteService(service.id);
                  }}
                >
                  <Trash2 /> Remover
                </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Resposta" value={last?.ok ? `${last.ms}` : "—"} unit={last?.ok ? "ms" : ""} />
        <Metric label="Média" value={avg != null ? `${avg}` : "—"} unit={avg != null ? "ms" : ""} />
        <Metric
          label="Disponível"
          value={uptime != null ? `${uptime}` : "—"}
          unit={uptime != null ? "%" : ""}
          tone={uptime != null && uptime < 95 ? "down" : undefined}
        />
      </div>

      <div>
        <div className="flex h-7 items-end gap-[2px]" aria-label="Histórico das últimas verificações">
          {slots.map((c, i) => (
            <span
              key={i}
              title={c ? `${new Date(c.at).toLocaleTimeString("pt-BR")} · ${c.ok ? `${c.ms} ms` : (c.error ?? "Falhou")}` : ""}
              className={cn(
                "flex-1 rounded-[2px] transition-all",
                !c && "h-2 bg-muted",
                c?.ok && "h-full bg-success/80",
                c && !c.ok && "h-full bg-destructive",
              )}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Antes</span>
          <span>Agora</span>
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="tabular">
          {busy ? "Verificando…" : `Verificado ${ago(runtime?.lastCheckedAt ?? null, now)}`}
        </span>
        <span className="text-border">•</span>
        <span>a cada {interval}</span>
        {last && !last.ok && <span className="ml-auto text-destructive">{last.error}</span>}
      </footer>
    </article>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: string; unit: string; tone?: "down" | undefined }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-mono text-lg font-medium tabular", tone === "down" && "text-destructive")}>
        {value}
        <span className="ml-0.5 text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function safeHost(url: string) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== "/" ? u.pathname : "");
  } catch {
    return url;
  }
}
