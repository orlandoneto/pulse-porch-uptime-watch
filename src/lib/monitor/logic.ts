import type { AlertKind, CheckResult, Profile, Service, Status } from "./types";

export const HISTORY_LIMIT = 40;

export const INTERVAL_OPTIONS = [
  { value: 30, label: "30 segundos" },
  { value: 60, label: "1 minuto" },
  { value: 300, label: "5 minutos" },
  { value: 900, label: "15 minutos" },
  { value: 1800, label: "30 minutos" },
] as const;

/** Cada área (e-mail) vê apenas os sites que ela mesma adicionou. */
export function canSee(profile: Profile | null | undefined, service: Service): boolean {
  if (!profile) return false;
  return service.ownerId === profile.id;
}

export function visibleServices(profile: Profile | null | undefined, services: Service[]): Service[] {
  return services.filter((s) => canSee(profile, s));
}

/** Quem recebe e-mail quando o site muda de estado: só o e-mail da área dona. */
export function alertRecipients(service: Service, profiles: Profile[]): Profile[] {
  return profiles.filter((p) => p.emailAlerts && p.email.trim() !== "" && canSee(p, service));
}

/** Decide se uma mudança de estado deve disparar aviso. */
export function transitionAlert(
  previous: Status,
  next: Status,
  alertOnRecovery: boolean,
): AlertKind | null {
  if (next === "down" && previous !== "down") return "down";
  if (next === "up" && previous === "down" && alertOnRecovery) return "recovered";
  return null;
}

export function isDue(lastCheckedAt: number | null, intervalSec: number, now: number): boolean {
  if (lastCheckedAt == null) return true;
  return now - lastCheckedAt >= intervalSec * 1000;
}

export function pushCheck(checks: CheckResult[], result: CheckResult): CheckResult[] {
  const next = [...checks, result];
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next;
}

export function uptimePercent(checks: CheckResult[]): number | null {
  if (checks.length === 0) return null;
  const ok = checks.filter((c) => c.ok).length;
  return Math.round((ok / checks.length) * 1000) / 10;
}

export function averageMs(checks: CheckResult[]): number | null {
  const ok = checks.filter((c) => c.ok);
  if (ok.length === 0) return null;
  return Math.round(ok.reduce((sum, c) => sum + c.ms, 0) / ok.length);
}

/** Aceita "meusite.com" e devolve "https://meusite.com". Retorna null se inválido. */
export function normalizeUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withProto);
    if (!u.hostname.includes(".") && u.hostname !== "localhost") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
