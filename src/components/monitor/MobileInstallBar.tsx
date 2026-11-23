import { Copy, Download, Share2, X } from "lucide-react";
import { useState, type MouseEvent, type PointerEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  copyAppLink,
  isAndroidDevice,
  isIosDevice,
  isStandaloneApp,
  promptInstall,
  shareAppLink,
  useCanInstall,
  useIsMobile,
} from "@/lib/monitor/install";

/** Barra fixa no celular: instalar como app (some se já estiver instalado). */
export function MobileInstallBar() {
  const isMobile = useIsMobile();
  const canInstall = useCanInstall();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("onwatch-install-dismissed") === "1";
  });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!isMobile || isStandaloneApp() || dismissed) return null;

  const openSheet = (e?: MouseEvent | PointerEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpen(true);
  };

  const runNativeInstall = async () => {
    setBusy(true);
    const result = await promptInstall();
    setBusy(false);
    if (result === "accepted") {
      toast.success("Instalado! Abra o OnWatch pelo ícone na tela inicial.");
      setOpen(false);
      return;
    }
    if (result === "dismissed") {
      toast.message("Instalação cancelada", { description: "Toque de novo em Instalar agora se quiser." });
      return;
    }
    if (result === "unavailable") {
      toast.message("Use o menu do navegador", {
        description: isIosDevice()
          ? "Safari → Compartilhar → Adicionar à Tela de Início"
          : "Chrome → ⋮ → Instalar app / Adicionar à tela inicial",
      });
      return;
    }
    toast.error("Não foi possível abrir o instalador", {
      description: "Siga os passos abaixo nesta tela.",
    });
  };

  const onShare = async () => {
    const ok = await shareAppLink();
    if (!ok) toast.message("Compartilhar indisponível neste navegador");
  };

  const onCopy = async () => {
    const ok = await copyAppLink();
    if (ok) toast.success("Link copiado");
    else toast.error("Não foi possível copiar o link");
  };

  const dismiss = (e?: MouseEvent | PointerEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    sessionStorage.setItem("onwatch-install-dismissed", "1");
    setDismissed(true);
    setOpen(false);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-[60] px-3 md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-xl border border-border bg-surface p-2 shadow-lg">
          <button
            type="button"
            className="inline-flex h-12 min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow active:scale-[0.98]"
            onClick={openSheet}
          >
            <Download className="size-4 shrink-0" aria-hidden />
            Instalar como app
          </button>
          <button
            type="button"
            className="inline-flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground active:bg-accent"
            aria-label="Fechar"
            onClick={dismiss}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl border border-border bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" />
            <h2 id="install-guide-title" className="text-lg font-semibold">
              Instalar o OnWatch
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Depois ele abre em tela cheia, sem a barra do navegador.
            </p>

            {canInstall ? (
              <button
                type="button"
                disabled={busy}
                className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow disabled:opacity-60"
                onClick={() => void runNativeInstall()}
              >
                <Download className="size-4" />
                {busy ? "Abrindo instalador…" : "Instalar agora"}
              </button>
            ) : null}

            <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm text-foreground">
              {isIosDevice() ? (
                <>
                  <li>
                    Abra este site no <strong>Safari</strong> (não no Chrome).
                  </li>
                  <li>
                    Toque em <strong>Compartilhar</strong> <span aria-hidden>􀈂</span> (quadrado com seta para cima).
                  </li>
                  <li>
                    Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.
                  </li>
                  <li>
                    Toque em <strong>Adicionar</strong>.
                  </li>
                </>
              ) : isAndroidDevice() ? (
                <>
                  <li>
                    Toque em <strong>⋮</strong> no canto superior direito do Chrome.
                  </li>
                  <li>
                    Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
                  </li>
                  <li>
                    Confirme e abra o ícone <strong>OnWatch</strong> na tela inicial.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    No menu do navegador, escolha <strong>Instalar app</strong> / <strong>Adicionar à tela
                    inicial</strong>.
                  </li>
                  <li>Abra pelo ícone OnWatch na tela inicial.</li>
                </>
              )}
            </ol>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => void onShare()}>
                <Share2 className="size-4" /> Compartilhar
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => void onCopy()}>
                <Copy className="size-4" /> Copiar link
              </Button>
            </div>

            <Button type="button" className="mt-3 h-11 w-full" variant="secondary" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
