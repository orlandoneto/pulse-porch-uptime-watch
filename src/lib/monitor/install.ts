import { useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let listening = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function listenForInstallPrompt() {
  if (typeof window === "undefined" || listening) return;
  listening = true;
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

export function waitForInstallPrompt(timeoutMs = 2500): Promise<boolean> {
  if (deferred) return Promise.resolve(true);
  if (typeof window === "undefined") return Promise.resolve(false);
  listenForInstallPrompt();
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (deferred) {
        resolve(true);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 80);
    };
    tick();
  });
}

/** Diálogo nativo do Chrome: Instalar app → ícone na home. */
export async function promptInstall(): Promise<PromptInstallResult> {
  if (!deferred) await waitForInstallPrompt(2000);
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

export async function installAppFromButton(): Promise<PromptInstallResult> {
  listenForInstallPrompt();
  if (isIosDevice()) return "unavailable";
  await waitForInstallPrompt(3000);
  return promptInstall();
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

export function useIsStandalone(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {};
      const mq = window.matchMedia("(display-mode: standalone)");
      const on = () => onChange();
      mq.addEventListener("change", on);
      window.addEventListener("appinstalled", on);
      return () => {
        mq.removeEventListener("change", on);
        window.removeEventListener("appinstalled", on);
      };
    },
    () => isStandaloneApp(),
    () => false,
  );
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

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
      return () => mq.removeEventListener("change", on);
    },
    () => isMobileDevice(),
    () => false,
  );
}
