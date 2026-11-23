import { Download } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { installAppFromButton, isIosDevice, useIsStandalone } from "@/lib/monitor/install";

async function runInstall(setBusy: (v: boolean) => void) {
  setBusy(true);
  if (isIosDevice()) {
    toast.message("iPhone: abra no Safari → seta para cima → Adicionar à Tela de Início");
    setBusy(false);
    return;
  }
  toast.message("Abrindo instalador…");
  const result = await installAppFromButton();
  setBusy(false);
  if (result === "accepted") {
    toast.success("Pronto! Ícone OnWatch na tela inicial.");
    return;
  }
  if (result === "dismissed") {
    toast.message("Cancelado — toque de novo em INSTALAR APP");
    return;
  }
  toast.error("Toque em ⋮ no Chrome → Instalar app", { duration: 10000 });
}

/** Faixa no topo: impossível não ver. */
export function InstallTopBanner() {
  const installed = useIsStandalone();
  const [busy, setBusy] = useState(false);
  if (installed) return null;

  return (
    <div className="border-b border-primary/40 bg-primary px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm font-medium text-primary-foreground">
          Instale o OnWatch no celular — ícone na tela inicial, abre como app.
        </p>
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-background px-5 text-sm font-bold uppercase text-foreground shadow active:scale-[0.98] disabled:opacity-70 sm:w-auto sm:min-w-[200px]"
          onClick={(e: MouseEvent) => {
            e.preventDefault();
            void runInstall(setBusy);
          }}
        >
          <Download className="size-5" />
          {busy ? "Instalando…" : "Instalar app"}
        </button>
      </div>
    </div>
  );
}

/** Botão no header. */
export function HeaderInstallButton() {
  const installed = useIsStandalone();
  const [busy, setBusy] = useState(false);
  if (installed) return null;

  return (
    <button
      type="button"
      disabled={busy}
      className="ml-auto inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-bold uppercase text-primary-foreground shadow active:scale-[0.98] disabled:opacity-70"
      onClick={(e) => {
        e.preventDefault();
        void runInstall(setBusy);
      }}
    >
      <Download className="size-4" />
      {busy ? "…" : "Instalar"}
    </button>
  );
}

/** Barra fixa embaixo — sempre, em qualquer tela. */
export function MobileInstallBar() {
  const installed = useIsStandalone();
  const [busy, setBusy] = useState(false);
  if (installed) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-[70] px-3 md:bottom-3">
      <div className="mx-auto max-w-lg rounded-xl border-2 border-primary bg-background p-2 shadow-2xl">
        <button
          type="button"
          disabled={busy}
          className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-base font-bold uppercase tracking-wide text-primary-foreground active:scale-[0.98] disabled:opacity-70"
          onClick={(e) => {
            e.preventDefault();
            void runInstall(setBusy);
          }}
        >
          <Download className="size-5 shrink-0" />
          {busy ? "Instalando…" : "Instalar app"}
        </button>
      </div>
    </div>
  );
}
