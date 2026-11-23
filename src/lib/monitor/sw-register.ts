// Registra o service worker de notificações (sem cache) só no app publicado.
// Ele existe para que o celular consiga exibir notificações do app instalado.
const SW_PATH = "/notify-sw.js";

function isPreviewHost(host: string): boolean {
  const h = host.toLowerCase();
  const label = h.split(".")[0] ?? "";
  const lovableHosts = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];
  if (lovableHosts.some((d) => h.endsWith(d))) {
    if (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(label)) return true;
    if (/^project--.+-dev$/.test(label)) return true;
  }
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterOurs() {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => (r.active ?? r.installing ?? r.waiting)?.scriptURL.endsWith(SW_PATH))
      .map((r) => r.unregister()),
  );
}

export async function registerNotifyWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    inIframe = true;
  }
  const off = new URLSearchParams(window.location.search).get("sw") === "off";
  if (!import.meta.env.PROD || inIframe || off || isPreviewHost(window.location.hostname)) {
    await unregisterOurs().catch(() => {});
    return;
  }
  await navigator.serviceWorker.register(SW_PATH).catch(() => {});
}
