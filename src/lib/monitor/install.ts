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

/** Espera o Chrome disparar beforeinstallprompt (até timeoutMs). */
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
      window.setTimeout(tick, 100);
    };
    tick();
  });
}

/** Dispara o mesmo diálogo do menu ⋮ → Instalar app (Chrome/Edge Android). */
export async function promptInstall(): Promise<PromptInstallResult> {
  if (!deferred) {
    await waitForInstallPrompt(1500);
  }
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

/**
 * Clique do botão "Instalar app":
 * 1) tenta o instalador nativo (ícone na home)
 * 2) se o navegador não oferecer, o caller mostra o guia
 */
export async function installAppFromButton(): Promise<PromptInstallResult> {
  listenForInstallPrompt();
  if (isIosDevice()) return "unavailable";
  await waitForInstallPrompt(2800);
  return promptInstall();
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
