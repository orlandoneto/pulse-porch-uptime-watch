import { Download, Smartphone, X } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";
import {
  installAppFromButton,
  isAndroidDevice,
  isIosDevice,
  isStandaloneApp,
  useIsMobile,
} from "@/lib/monitor/install";

/**
 * Só instalação — sem compartilhar / copiar link.
 * Android Chrome: diálogo nativo (= ⋮ → Instalar app → ícone na home).
 * iPhone: passos do Safari (Apple não permite instalar por botão).
 */
export function MobileInstallBar() {
  const isMobile = useIsMobile();
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

    if (isIosDevice()) {
      setOpen(true);
      setBusy(false);
      return;
    }

    const result = await installAppFromButton();
    setBusy(false);

    if (result === "accepted") {
      toast.success("Instalado! Abra o ícone OnWatch na tela inicial.");
      setOpen(false);
      return;
    }
    if (result === "dismissed") {
      toast.message("Instalação cancelada — toque de novo em Instalar app");
      return;
    }

    setOpen(true);
    toast.message("Instalar pelo Chrome", {
      description: "Menu ⋮ → Instalar app (não Compartilhar)",
    });
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
            {busy ? "Instalando…" : "Instalar app"}
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
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl border border-border bg-background p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-md bg-primary/15 text-primary">
                <Smartphone className="size-5" />
              </span>
              <div>
                <h2 id="install-guide-title" className="text-lg font-semibold">
                  Instalar app
                </h2>
                <p className="text-sm text-muted-foreground">Ícone na tela inicial, sem navegador</p>
              </div>
            </div>

            <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm text-foreground">
              {isIosDevice() ? (
                <>
                  <li>
                    Abra este site no <strong>Safari</strong>.
                  </li>
                  <li>
                    No Safari, toque no ícone do sistema (quadrado com seta para cima).
                  </li>
                  <li>
                    Escolha <strong>Adicionar à Tela de Início</strong> → <strong>Adicionar</strong>.
                  </li>
                </>
              ) : isAndroidDevice() ? (
                <>
                  <li>
                    Toque em <strong>⋮</strong> no canto superior direito do Chrome.
                  </li>
                  <li>
                    Toque em <strong>Instalar app</strong> — <em>não</em> em Compartilhar.
                  </li>
                  <li>
                    Confirme — o ícone <strong>OnWatch</strong> aparece na home.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    No menu do navegador, escolha <strong>Instalar app</strong>.
                  </li>
                  <li>Abra pelo ícone OnWatch na tela inicial.</li>
                </>
              )}
            </ol>

            {!isIosDevice() ? (
              <button
                type="button"
                disabled={busy}
                className="mt-5 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-70"
                onClick={(e) => void onInstallClick(e)}
              >
                <Download className="size-4" />
                {busy ? "Instalando…" : "Instalar app agora"}
              </button>
            ) : null}

            <button
              type="button"
              className="mt-2 inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-md text-sm text-muted-foreground"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
