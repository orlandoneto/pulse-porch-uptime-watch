import { Download, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  isIosDevice,
  isStandaloneApp,
  promptInstall,
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
  const [guideOpen, setGuideOpen] = useState(false);

  if (!isMobile || isStandaloneApp() || dismissed) return null;

  const install = async () => {
    if (canInstall) {
      await promptInstall();
      toast.success("OnWatch instalado — abra pelo ícone na tela inicial");
      return;
    }
    setGuideOpen(true);
  };

  const dismiss = () => {
    sessionStorage.setItem("onwatch-install-dismissed", "1");
    setDismissed(true);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-40 px-3 md:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-xl border border-border bg-surface/95 p-2 shadow-lg backdrop-blur">
          <Button className="h-11 min-h-11 flex-1 gap-2 text-sm font-semibold" onClick={() => void install()}>
            <Download className="size-4" />
            Instalar como app
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Fechar"
            onClick={dismiss}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {guideOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={() => setGuideOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="install-guide-title" className="text-base font-semibold">
              Instalar o OnWatch
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assim ele abre como app, sem a barra do navegador.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-foreground">
              {isIosDevice() ? (
                <>
                  <li>
                    Use o <strong>Safari</strong> (não o Chrome).
                  </li>
                  <li>
                    Toque em <strong>Compartilhar</strong> (quadrado com seta).
                  </li>
                  <li>
                    Toque em <strong>Adicionar à Tela de Início</strong>.
                  </li>
                  <li>
                    Confirme em <strong>Adicionar</strong>.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    No Chrome, toque em <strong>⋮</strong> (canto superior direito).
                  </li>
                  <li>
                    Escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
                  </li>
                  <li>Abra pelo ícone OnWatch na tela inicial.</li>
                </>
              )}
            </ol>
            <Button className="mt-5 w-full" onClick={() => setGuideOpen(false)}>
              Entendi
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
