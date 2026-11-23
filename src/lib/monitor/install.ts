import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function listenForInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

export function useCanInstall() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => deferred !== null,
    () => false,
  );
}

export type PromptInstallResult = "accepted" | "dismissed" | "unavailable" | "error";

/** Dispara o diálogo nativo do Chrome/Edge. Retorna o resultado real. */
export async function promptInstall(): Promise<PromptInstallResult> {
  if (!deferred) return "unavailable";
  const event = deferred;
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    emit();
    return outcome;
  } catch {
    deferred = null;
    emit();
    return "error";
  }
}

/** Já rodando como app na tela inicial (standalone). */
export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** Celular / tablet — botão de instalar só nesses aparelhos. */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  if (isIosDevice() || isAndroidDevice()) return true;
  return window.matchMedia("(max-width: 768px)").matches;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(max-width: 768px)");
      const on = () => onChange();
      mq.addEventListener("change", on);
      window.addEventListener("orientationchange", on);
      return () => {
        mq.removeEventListener("change", on);
        window.removeEventListener("orientationchange", on);
      };
    },
    () => isMobileDevice(),
    () => false,
  );
}

export async function shareAppLink(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share({
      title: "OnWatch",
      text: "Monitor de sites — instale na tela inicial",
      url: window.location.origin,
    });
    return true;
  } catch {
    return false;
  }
}

export async function copyAppLink(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(window.location.origin);
    return true;
  } catch {
    return false;
  }
}
