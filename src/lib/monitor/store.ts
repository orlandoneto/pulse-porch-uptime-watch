import { useSyncExternalStore } from "react";
import type { AppState, Profile } from "./types";

const STORAGE_KEY = "onwatch:v2";

export const defaultState: AppState = {
  profiles: [],
  services: [],
  runtime: {},
  currentProfileId: null,
  settings: {
    pushEnabled: false,
    alertOnRecovery: true,
    timeoutSec: 10,
    emailjs: { serviceId: "", templateId: "", publicKey: "" },
  },
};

let state: AppState = defaultState;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function readStorage(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...defaultState,
      ...parsed,
      settings: {
        ...defaultState.settings,
        ...parsed.settings,
        emailjs: { ...defaultState.settings.emailjs, ...parsed.settings?.emailjs },
      },
    };
  } catch {
    return defaultState;
  }
}

export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  state = readStorage();
  hydrated = true;
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state = readStorage();
      emit();
    }
  });
  emit();
}

export function getState(): AppState {
  return state;
}

export function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* armazenamento cheio ou bloqueado */
  }
  emit();
}

export function replaceState(next: AppState) {
  setState(() => next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => defaultState,
  );
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hydrated,
    () => false,
  );
}

export function useCurrentProfile(): Profile | null {
  const s = useAppState();
  return s.profiles.find((p) => p.id === s.currentProfileId) ?? null;
}
