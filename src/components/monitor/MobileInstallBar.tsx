import { Copy, Download, Share2, X } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  copyAppLink,
  installAppFromButton,
  isAndroidDevice,
  isIosDevice,
  isStandaloneApp,
  shareAppLink,
  useCanInstall,
  useIsMobile,
} from "@/lib/monitor/install";

/** Barra no celular: botão = mesmo fluxo do Chrome ⋮ → Instalar app (quando o SO permite). */
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

  const onInstallClick = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);

    // Android/Chrome: dispara o diálogo nativo (ícone na home) — equivalente a ⋮ → Instalar app
    if (!isIosDevice()) {
      const result = await installAppFromButton();
      if (result === "accepted") {
        toast.success("App instalado! Use o ícone OnWatch na tela inicial.");
        setBusy(false);
        return;
      }
      if (result === "dismissed") {
        toast.message("Instalação cancelada");
        setBusy(false);
        return;
      }
    }

    // iPhone, ou Chrome ainda não liberou o prompt → painel com o caminho certo
    setOpen(true);
    setBusy(false);
    if (!isIosDevice() && !canInstall) {
      toast.message("Abra pelo menu do Chrome", {
        description: "⋮ → Instalar app (ou Adicionar à tela inicial)",
      });
    }
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

  const dismiss = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
            disabled={busy}
            className="inline-flex h-12 min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow active:scale-[0.98] disabled:opacity-70"
            onClick={(e) => void onInstallClick(e)}
          >
            <Download className="size-4 shrink-0" aria-hidden />
            {busy ? "Abrindo instalador…" : "Instalar app"}
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
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted sm:hidden" />
            <h2 id="install-guide-title" className="text-lg font-semibold">
              Colocar o ícone na tela inicial
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isIosDevice()
                ? "No iPhone o Safari controla a instalação. Siga os passos:"
                : "Se o Chrome não abriu o instalador sozinho, use o menu:"}
            </p>

            <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm text-foreground">
              {isIosDevice() ? (
                <>
                  <li>
                    Abra no <strong>Safari</strong>.
                  </li>
                  <li>
                    Toque em <strong>Compartilhar</strong> (quadrado com seta).
                  </li>
                  <li>
                    <strong>Adicionar à Tela de Início</strong> → <strong>Adicionar</strong>.
                  </li>
                </>
              ) : isAndroidDevice() ? (
                <>
                  <li>
                    Toque em <strong>⋮</strong> (canto superior direito).
                  </li>
                  <li>
                    Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
                  </li>
                  <li>
                    Confirme — o ícone <strong>OnWatch</strong> aparece na home.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    Menu do navegador → <strong>Instalar app</strong>.
                  </li>
                  <li>Abra pelo ícone na tela inicial.</li>
                </>
              )}
            </ol>

            {!isIosDevice() && canInstall ? (
              <button
                type="button"
                className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground"
                onClick={(e) => void onInstallClick(e)}
              >
                <Download className="size-4" /> Tentar Instalar app de novo
              </button>
            ) : null}

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
