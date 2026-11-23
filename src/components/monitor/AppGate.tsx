import { Link } from "@tanstack/react-router";
import { LayoutGrid, MoreHorizontal, Pencil, Plus, Settings2, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteProfile, importFile, switchProfile } from "@/lib/monitor/actions";
import { useAppState, useCurrentProfile, useHydrated } from "@/lib/monitor/store";
import type { Profile } from "@/lib/monitor/types";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { HeaderInstallButton, InstallTopBanner, MobileInstallBar } from "./MobileInstallBar";
import { ProfileDialog } from "./ProfileDialog";

export function AppGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const state = useAppState();
  const me = useCurrentProfile();
  const firstId = state.profiles[0]?.id;

  useEffect(() => {
    if (hydrated && !me && firstId) switchProfile(firstId);
  }, [hydrated, me, firstId]);

  if (!hydrated) return <LoadingShell />;
  const noAreas = state.profiles.length === 0;
  if (!noAreas && !me) return <LoadingShell />;

  return (
    <div className="min-h-screen pb-40 md:pb-28">
      <Header />
      <InstallTopBanner />
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">{noAreas ? <NoAreas /> : children}</main>
      <MobileInstallBar />
      <MobileNav />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" icon={<LayoutGrid />} label="Painel" />
          <NavLink to="/ajustes" icon={<Settings2 />} label="Ajustes" />
        </nav>
        <HeaderInstallButton />
      </div>
      <AreaBar />
    </header>
  );
}

/** Faixa com um botão para cada e-mail (área) e o botão + para adicionar outro. */
function AreaBar() {
  const state = useAppState();
  const me = useCurrentProfile();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);

  const downIn = (id: string) =>
    state.services.some((s) => s.ownerId === id && !s.paused && state.runtime[s.id]?.status === "down");

  return (
    <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2.5 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none]">
        {state.profiles.map((p) => {
          const active = p.id === me?.id;
          const down = downIn(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                "flex shrink-0 items-center rounded-full border text-sm transition-colors",
                active ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <button onClick={() => switchProfile(p.id)} className="flex items-center gap-2 py-1 pl-3 pr-2">
                <span className={cn("size-1.5 rounded-full", down ? "bg-destructive" : "bg-success")} />
                <span className="max-w-[14rem] truncate font-mono text-xs">{p.name || p.email}</span>
              </button>
              {active && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="mr-1 grid size-6 place-items-center rounded-full hover:bg-accent" aria-label="Opções da área">
                      <MoreHorizontal className="size-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(p);
                        setOpen(true);
                      }}
                    >
                      <Pencil /> Editar e-mail
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => {
                        if (confirm(`Remover a área de ${p.email} e todos os sites dela?`)) deleteProfile(p.id);
                      }}
                    >
                      <Trash2 /> Remover área
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 shrink-0 rounded-full bg-surface px-3"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        aria-label="Adicionar e-mail"
      >
        <Plus /> <span className="hidden sm:inline">E-mail</span>
      </Button>
      <ProfileDialog open={open} onOpenChange={setOpen} profile={editing} />
    </div>
  );
}

function NavLink({ to, icon, label }: { to: "/" | "/ajustes"; icon: ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4 data-[status=active]:bg-accent data-[status=active]:text-foreground"
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileNav() {
  const items = [
    { to: "/" as const, icon: <LayoutGrid />, label: "Painel" },
    { to: "/ajustes" as const, icon: <Settings2 />, label: "Ajustes" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-2">
        {items.map((i) => (
          <Link
            key={i.to}
            to={i.to}
            activeOptions={{ exact: true }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground [&_svg]:size-5 data-[status=active]:text-primary"
          >
            {i.icon}
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function LoadingShell() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-20 sm:px-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

/** Painel vazio, sem login: um botão + cria a primeira área pelo e-mail. */
function NoAreas() {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs tracking-wider text-muted-foreground">Painel de monitoramento</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Nenhum site monitorado</h1>
      </div>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {["Monitorados", "No ar", "Fora do ar", "Resposta média"].map((l) => (
          <div key={l} className="panel p-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{l}</div>
            <div className="mt-2 font-mono text-3xl font-medium text-muted-foreground">—</div>
          </div>
        ))}
      </section>
      <button
        onClick={() => setOpen(true)}
        className="panel group grid w-full place-items-center gap-4 border-dashed px-6 py-16 text-center transition-colors hover:border-primary/60"
      >
        <span className="grid size-14 place-items-center rounded-full border border-primary/40 bg-primary/10 text-primary transition-transform group-hover:scale-105">
          <Plus className="size-6" />
        </span>
        <span className="text-lg font-semibold">Adicionar e-mail</span>
        <span className="max-w-sm text-sm text-muted-foreground">
          Cada e-mail ganha uma área para adicionar os links. Se algum sair do ar, o aviso chega nesse e-mail e no
          aparelho.
        </span>
      </button>
      <div className="text-center">
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              const r = importFile(await f.text());
              toast.success(`Importado: ${r.services} sites`);
            } catch {
              toast.error("Arquivo inválido");
            }
          }}
        />
        <Button variant="link" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload /> Restaurar um backup
        </Button>
      </div>
      <ProfileDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
