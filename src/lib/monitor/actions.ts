import { getState, setState } from "./store";
import { pushCheck, uid } from "./logic";
import type { CheckResult, Profile, Service, Settings, Status } from "./types";

/** Cria uma nova área pelo e-mail e já entra nela. */
export function createProfile(data: Omit<Profile, "id">): Profile {
  const profile: Profile = { ...data, id: uid() };
  setState((s) => ({ ...s, profiles: [...s.profiles, profile], currentProfileId: profile.id }));
  return profile;
}

export function updateProfile(id: string, data: Partial<Omit<Profile, "id">>) {
  setState((s) => ({ ...s, profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...data } : p)) }));
}

/** Remove a área e todos os sites dela. */
export function deleteProfile(id: string) {
  setState((s) => {
    const profiles = s.profiles.filter((p) => p.id !== id);
    const removed = s.services.filter((svc) => svc.ownerId === id).map((svc) => svc.id);
    const runtime = { ...s.runtime };
    for (const r of removed) delete runtime[r];
    return {
      ...s,
      profiles,
      services: s.services.filter((svc) => svc.ownerId !== id),
      runtime,
      currentProfileId: s.currentProfileId === id ? (profiles[0]?.id ?? null) : s.currentProfileId,
    };
  });
}

export function switchProfile(id: string) {
  setState((s) => ({ ...s, currentProfileId: id }));
}

export function addService(data: Omit<Service, "id" | "createdAt" | "paused">): Service {
  const service: Service = { ...data, id: uid(), paused: false, createdAt: Date.now() };
  setState((s) => ({ ...s, services: [...s.services, service] }));
  return service;
}

export function updateService(id: string, data: Partial<Omit<Service, "id">>) {
  setState((s) => ({
    ...s,
    services: s.services.map((svc) => (svc.id === id ? { ...svc, ...data } : svc)),
    // Ao trocar a URL, o histórico antigo deixa de valer.
    runtime:
      data.url !== undefined && s.services.find((x) => x.id === id)?.url !== data.url
        ? omit(s.runtime, id)
        : s.runtime,
  }));
}

export function deleteService(id: string) {
  setState((s) => ({
    ...s,
    services: s.services.filter((svc) => svc.id !== id),
    runtime: omit(s.runtime, id),
  }));
}

export function recordCheck(serviceId: string, result: CheckResult): { prev: Status; next: Status } {
  const current = getState().runtime[serviceId];
  const prev: Status = current?.status ?? "unknown";
  const next: Status = result.ok ? "up" : "down";
  setState((s) => {
    if (!s.services.some((x) => x.id === serviceId)) return s;
    const rt = s.runtime[serviceId];
    return {
      ...s,
      runtime: {
        ...s.runtime,
        [serviceId]: {
          status: next,
          lastCheckedAt: result.at,
          lastChangeAt: prev !== next ? result.at : (rt?.lastChangeAt ?? result.at),
          checks: pushCheck(rt?.checks ?? [], result),
        },
      },
    };
  });
  return { prev, next };
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

/* ---------- Backup ---------- */

interface ExportFile {
  app: "onwatch";
  version: 2;
  profiles: Profile[];
  services: Service[];
  settings?: Settings;
}

export function buildFullBackup(): ExportFile {
  const s = getState();
  return { app: "onwatch", version: 2, profiles: s.profiles, services: s.services, settings: s.settings };
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importFile(text: string): { profiles: number; services: number } {
  const data = JSON.parse(text) as Partial<ExportFile>;
  if (data.app !== "onwatch" || data.version !== 2 || !Array.isArray(data.profiles) || !Array.isArray(data.services)) {
    throw new Error("Arquivo inválido");
  }
  const profiles = data.profiles;
  const services = data.services;
  setState((s) => {
    const mergedProfiles = mergeById(s.profiles, profiles);
    return {
      ...s,
      profiles: mergedProfiles,
      services: mergeById(s.services, services),
      currentProfileId: s.currentProfileId ?? mergedProfiles[0]?.id ?? null,
      settings: data.settings
        ? { ...s.settings, ...data.settings, pushEnabled: s.settings.pushEnabled }
        : s.settings,
    };
  });
  return { profiles: profiles.length, services: services.length };
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const map = new Map(current.map((x) => [x.id, x]));
  for (const item of incoming) map.set(item.id, item);
  return [...map.values()];
}

function omit<T>(obj: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = obj;
  return rest;
}
