import type { AlertKind, EmailJsSettings, Profile, Service } from "./types";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!pushSupported()) return "unsupported";
  return Notification.requestPermission();
}

export function alertText(kind: AlertKind, service: Service) {
  return kind === "down"
    ? { title: `🔴 ${service.name} está fora do ar`, body: `${service.url} não respondeu.` }
    : { title: `🟢 ${service.name} voltou ao ar`, body: `${service.url} está respondendo novamente.` };
}

export async function showPush(title: string, body: string, tag?: string) {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = { body, icon: "/icon-192.png", badge: "/icon-192.png", ...(tag ? { tag } : {}) };
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, options);
      return true;
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

export function emailConfigured(cfg: EmailJsSettings): boolean {
  return Boolean(cfg.serviceId.trim() && cfg.templateId.trim() && cfg.publicKey.trim());
}

export async function sendEmail(
  cfg: EmailJsSettings,
  to: Profile,
  params: { subject: string; message: string; service_name: string; service_url: string; status: string },
): Promise<boolean> {
  if (!emailConfigured(cfg)) return false;
  try {
    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: cfg.serviceId.trim(),
        template_id: cfg.templateId.trim(),
        user_id: cfg.publicKey.trim(),
        template_params: {
          to_email: to.email,
          to_name: to.name,
          time: new Date().toLocaleString("pt-BR"),
          ...params,
        },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
