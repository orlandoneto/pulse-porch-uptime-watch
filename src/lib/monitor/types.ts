/** Uma "área": identificada pelo e-mail, com os seus próprios sites. Sem login. */
export interface Profile {
  id: string;
  name: string;
  email: string;
  /** Recebe avisos por e-mail quando um site da área cai ou volta. */
  emailAlerts: boolean;
}

export interface Service {
  id: string;
  name: string;
  url: string;
  intervalSec: number;
  /** Área (e-mail) dona deste site. */
  ownerId: string;
  paused: boolean;
  createdAt: number;
}

export type Status = "up" | "down" | "unknown";

export interface CheckResult {
  at: number;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface ServiceRuntime {
  status: Status;
  lastCheckedAt: number | null;
  lastChangeAt: number | null;
  checks: CheckResult[];
}

export interface EmailJsSettings {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export interface Settings {
  pushEnabled: boolean;
  alertOnRecovery: boolean;
  timeoutSec: number;
  emailjs: EmailJsSettings;
}

export interface AppState {
  profiles: Profile[];
  services: Service[];
  runtime: Record<string, ServiceRuntime>;
  currentProfileId: string | null;
  settings: Settings;
}

export type AlertKind = "down" | "recovered";
