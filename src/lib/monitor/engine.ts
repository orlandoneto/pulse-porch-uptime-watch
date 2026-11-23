import { toast } from "sonner";
import { recordCheck } from "./actions";
import { checkUrl } from "./check";
import { alertRecipients, isDue, transitionAlert } from "./logic";
import { alertText, emailConfigured, sendEmail, showPush } from "./notify";
import { getState } from "./store";
import type { AlertKind, Service } from "./types";

const inFlight = new Set<string>();

export function isChecking(id: string) {
  return inFlight.has(id);
}

export async function runCheck(serviceId: string) {
  if (inFlight.has(serviceId)) return;
  const svc = getState().services.find((s) => s.id === serviceId);
  if (!svc) return;
  inFlight.add(serviceId);
  try {
    const result = await checkUrl(svc.url, getState().settings.timeoutSec);
    const { prev, next } = recordCheck(serviceId, result);
    const kind = transitionAlert(prev, next, getState().settings.alertOnRecovery);
    if (kind) await dispatchAlert(kind, svc);
  } finally {
    inFlight.delete(serviceId);
  }
}

export function tick() {
  const s = getState();
  const now = Date.now();
  for (const svc of s.services) {
    if (svc.paused) continue;
    if (!isDue(s.runtime[svc.id]?.lastCheckedAt ?? null, svc.intervalSec, now)) continue;
    void runCheck(svc.id);
  }
}

export function checkAll(ids: string[]) {
  for (const id of ids) void runCheck(id);
}

async function dispatchAlert(kind: AlertKind, svc: Service) {
  const s = getState();
  const { title, body: baseBody } = alertText(kind, svc);
  const owner = s.profiles.find((p) => p.id === svc.ownerId);
  // Todas as áreas deste navegador recebem o aviso no aparelho; com várias, mostra de qual e-mail é.
  const body = s.profiles.length > 1 && owner ? `${baseBody} · ${owner.email}` : baseBody;

  if (kind === "down") toast.error(title, { description: body });
  else toast.success(title, { description: body });
  if (s.settings.pushEnabled) await showPush(title, body, `svc-${svc.id}`);

  if (emailConfigured(s.settings.emailjs)) {
    const recipients = alertRecipients(svc, s.profiles);
    await Promise.all(
      recipients.map((to) =>
        sendEmail(s.settings.emailjs, to, {
          subject: title.replace(/^\S+\s/, ""),
          message: body,
          service_name: svc.name,
          service_url: svc.url,
          status: kind === "down" ? "FORA DO AR" : "NO AR",
        }),
      ),
    );
  }
}
