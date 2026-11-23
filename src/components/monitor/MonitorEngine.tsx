import { useEffect } from "react";
import { tick } from "@/lib/monitor/engine";
import { listenForInstallPrompt } from "@/lib/monitor/install";
import { hydrateStore } from "@/lib/monitor/store";
import { registerNotifyWorker } from "@/lib/monitor/sw-register";

/** Roda em segundo plano enquanto o app está aberto e verifica cada site no seu intervalo. */
export function MonitorEngine() {
  useEffect(() => {
    hydrateStore();
    listenForInstallPrompt();
    void registerNotifyWorker();

    tick();
    const timer = setInterval(tick, 5000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", tick);
    };
  }, []);
  return null;
}
