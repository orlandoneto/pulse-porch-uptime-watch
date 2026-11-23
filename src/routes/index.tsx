import { createFileRoute } from "@tanstack/react-router";
import { Bell, Plus, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceCard } from "@/components/monitor/ServiceCard";
import { ServiceDialog } from "@/components/monitor/ServiceDialog";
import { useNow } from "@/components/monitor/useNow";
import { updateSettings } from "@/lib/monitor/actions";
import { checkAll } from "@/lib/monitor/engine";
import { averageMs, visibleServices } from "@/lib/monitor/logic";
import { pushSupported, requestPushPermission } from "@/lib/monitor/notify";
import { useAppState, useCurrentProfile } from "@/lib/monitor/store";
import type { Service } from "@/lib/monitor/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel — OnWatch" },
      { name: "description", content: "Veja em tempo real quais dos seus sites estão no ar ou fora do ar." },
      { property: "og:title", content: "Painel — OnWatch" },
      { property: "og:description", content: "Veja em tempo real quais dos seus sites estão no ar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Filter = "all" | "up" | "down";

function Dashboard() {
  const state = useAppState();
  const me = useCurrentProfile();
  const now = useNow(5000);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const mine = useMemo(() => visibleServices(me, state.services), [me, state.services]);
  const statusOf = (s: Service) => (s.paused ? "paused" : (state.runtime[s.id]?.status ?? "unknown"));
  const upCount = mine.filter((s) => statusOf(s) === "up").length;
  const downCount = mine.filter((s) => statusOf(s) === "down").length;
  const avg = averageMs(mine.flatMap((s) => (state.runtime[s.id]?.checks ?? []).slice(-5)));

  const list = mine
    .filter((s) => filter === "all" || statusOf(s) === filter)
    .filter((s) => {
      const q = query.trim().toLowerCase();
      return !q || s.name.toLowerCase().includes(q) || s.url.toLowerCase().includes(q);
    })
    .sort((a, b) => rank(statusOf(a)) - rank(statusOf(b)) || a.name.localeCompare(b.name));

  const showPushBanner = pushSupported() && !state.settings.pushEnabled;

  const enablePush = async () => {
    const perm = await requestPushPermission();
    if (perm === "granted") {
      updateSettings({ pushEnabled: true });
      toast.success("Notificações ativadas neste aparelho");
    } else {
      toast.error("Permissão negada", { description: "Libere as notificações nas configurações do navegador." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="truncate font-mono text-xs tracking-wider text-muted-foreground">{me?.name || me?.email}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {mine.length === 0
              ? "Nenhum site monitorado"
              : downCount > 0
                ? `${downCount} ${downCount === 1 ? "site fora do ar" : "sites fora do ar"}`
                : "Todos os sistemas no ar"}
          </h1>
        </div>
        <div className="flex gap-2">
          {mine.length > 0 && (
            <Button
              variant="outline"
              className="bg-surface"
              onClick={() => {
                checkAll(mine.filter((s) => !s.paused).map((s) => s.id));
                toast("Verificando todos os sites…");
              }}
            >
              <RefreshCw /> <span className="hidden sm:inline">Verificar todos</span>
            </Button>
          )}
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Adicionar site
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Monitorados" value={mine.length} />
        <Stat label="No ar" value={upCount} tone="up" />
        <Stat label="Fora do ar" value={downCount} tone={downCount > 0 ? "down" : undefined} />
        <Stat label="Resposta média" value={avg ?? "—"} unit={avg != null ? "ms" : undefined} />
      </section>

      {showPushBanner && (
        <div className="panel flex flex-wrap items-center gap-3 p-4">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Bell className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Receba um aviso quando algum site cair</p>
            <p className="text-xs text-muted-foreground">Ative as notificações neste aparelho.</p>
          </div>
          <Button size="sm" onClick={enablePush}>
            Ativar notificações
          </Button>
        </div>
      )}

      {mine.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList className="bg-surface">
              <TabsTrigger value="all">Todos · {mine.length}</TabsTrigger>
              <TabsTrigger value="up">No ar · {upCount}</TabsTrigger>
              <TabsTrigger value="down">Fora · {downCount}</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative sm:ml-auto sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar site"
              className="bg-surface pl-9"
            />
          </div>
        </div>
      )}

      {mine.length === 0 ? (
        <div className="panel grid place-items-center gap-3 px-6 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Nada por aqui</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Adicione os links desta área. Se algum sair do ar, o aviso vai para {me?.email}.
          </p>
          <Button
            className="mt-2"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus /> Adicionar site
          </Button>
        </div>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nenhum site neste filtro.</p>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              runtime={state.runtime[s.id]}
              now={now}
              onEdit={(svc) => {
                setEditing(svc);
                setDialogOpen(true);
              }}
            />
          ))}
        </section>
      )}

      <p className="pt-4 text-center text-xs text-muted-foreground">
        As verificações rodam enquanto o app estiver aberto neste aparelho.
      </p>

      <ServiceDialog open={dialogOpen} onOpenChange={setDialogOpen} service={editing} />
    </div>
  );
}

function rank(status: string) {
  return status === "down" ? 0 : status === "unknown" ? 1 : status === "up" ? 2 : 3;
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: number | string;
  unit?: string | undefined;
  tone?: "up" | "down" | undefined;
}) {
  return (
    <div className={cn("panel p-4", tone === "down" && "glow-down border-destructive/40")}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-2 font-mono text-3xl font-medium tabular",
          tone === "up" && "text-success",
          tone === "down" && "text-destructive",
        )}
      >
        {value}
        {unit && <span className="ml-1 text-sm text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}
