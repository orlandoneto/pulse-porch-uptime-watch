import { createFileRoute } from "@tanstack/react-router";
import { Bell, Download, Mail, Smartphone, Upload } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { buildFullBackup, downloadJson, importFile, updateSettings } from "@/lib/monitor/actions";
import {
  isAndroidDevice,
  isIosDevice,
  isStandaloneApp,
  promptInstall,
  useCanInstall,
} from "@/lib/monitor/install";
import { emailConfigured, pushSupported, requestPushPermission, sendEmail, showPush } from "@/lib/monitor/notify";
import { useAppState, useCurrentProfile } from "@/lib/monitor/store";

export const Route = createFileRoute("/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — OnWatch" },
      { name: "description", content: "Configure notificações, avisos por e-mail e instalação do OnWatch no celular." },
      { property: "og:title", content: "Ajustes — OnWatch" },
      { property: "og:description", content: "Configure notificações e avisos por e-mail." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings } = useAppState();
  const me = useCurrentProfile();
  const canInstall = useCanInstall();
  const fileRef = useRef<HTMLInputElement>(null);
  const [perm, setPerm] = useState<string>("default");
  const [ejs, setEjs] = useState(settings.emailjs);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setPerm(pushSupported() ? Notification.permission : "unsupported");
  }, []);
  useEffect(() => setEjs(settings.emailjs), [settings.emailjs]);

  const togglePush = async (on: boolean) => {
    if (!on) return updateSettings({ pushEnabled: false });
    const p = await requestPushPermission();
    setPerm(p);
    if (p === "granted") {
      updateSettings({ pushEnabled: true });
      toast.success("Notificações ativadas");
    } else toast.error("Permissão negada pelo navegador");
  };

  const saveEmail = () => {
    updateSettings({ emailjs: ejs });
    toast.success("Configuração de e-mail salva");
  };

  const testEmail = async () => {
    if (!me) return;
    updateSettings({ emailjs: ejs });
    setSending(true);
    const ok = await sendEmail(ejs, me, {
      subject: "Teste do OnWatch",
      message: "Se você recebeu este e-mail, os avisos estão funcionando.",
      service_name: "Teste",
      service_url: window.location.origin,
      status: "TESTE",
    });
    setSending(false);
    if (ok) toast.success(`E-mail de teste enviado para ${me.email}`);
    else toast.error("Não foi possível enviar", { description: "Confira os três códigos do EmailJS." });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuração</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Ajustes</h1>
      </div>

      <Section icon={<Bell />} title="Notificações neste aparelho">
        <Row
          title="Avisar quando um site cair"
          desc={
            perm === "unsupported"
              ? "Este navegador não suporta notificações. No iPhone, instale o app na tela de início primeiro."
              : perm === "denied"
                ? "Bloqueadas pelo navegador. Libere nas configurações do site."
                : "Mostra uma notificação no celular ou computador."
          }
        >
          <Switch
            checked={settings.pushEnabled && perm === "granted"}
            disabled={perm === "unsupported"}
            onCheckedChange={togglePush}
          />
        </Row>
        <Row title="Avisar quando voltar ao ar" desc="Também avisa quando o site se recupera.">
          <Switch checked={settings.alertOnRecovery} onCheckedChange={(v) => updateSettings({ alertOnRecovery: v })} />
        </Row>
        <Row title="Tempo máximo de espera" desc="Depois disso o site é considerado fora do ar.">
          <Select value={String(settings.timeoutSec)} onValueChange={(v) => updateSettings({ timeoutSec: Number(v) })}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 30].map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} segundos
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <div className="pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={perm !== "granted"}
            onClick={async () => {
              const ok = await showPush("OnWatch", "Notificação de teste funcionando.");
              if (!ok) toast.error("Não foi possível mostrar a notificação");
            }}
          >
            Enviar notificação de teste
          </Button>
        </div>
      </Section>

      <Section icon={<Mail />} title="Avisos por e-mail">
        <p className="text-sm text-muted-foreground">
          O envio usa o{" "}
          <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="text-primary underline">
            EmailJS
          </a>{" "}
          (gratuito até 200 e-mails/mês). Crie uma conta, conecte seu e-mail e um modelo. No modelo, use{" "}
          <code className="font-mono text-xs text-foreground">{"{{to_email}}"}</code> como destinatário e as variáveis{" "}
          <code className="font-mono text-xs text-foreground">
            {"{{subject}} {{message}} {{service_name}} {{service_url}} {{status}} {{time}}"}
          </code>
          .
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Service ID" value={ejs.serviceId} onChange={(v) => setEjs({ ...ejs, serviceId: v })} placeholder="service_xxx" />
          <Field label="Template ID" value={ejs.templateId} onChange={(v) => setEjs({ ...ejs, templateId: v })} placeholder="template_xxx" />
          <Field label="Public Key" value={ejs.publicKey} onChange={(v) => setEjs({ ...ejs, publicKey: v })} placeholder="abc123..." />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={saveEmail}>
            Salvar
          </Button>
          <Button size="sm" variant="outline" disabled={!emailConfigured(ejs) || sending} onClick={testEmail}>
            {sending ? "Enviando…" : "Enviar e-mail de teste"}
          </Button>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            {emailConfigured(settings.emailjs) ? "● configurado" : "○ não configurado"}
          </span>
        </div>
      </Section>

      <Section icon={<Smartphone />} title="Instalar no celular">
        {isStandaloneApp() ? (
          <p className="text-sm text-muted-foreground">OnWatch já está instalado neste aparelho.</p>
        ) : (
          <div className="space-y-4">
            {canInstall ? (
              <Button size="sm" onClick={() => void promptInstall()}>
                Instalar OnWatch
              </Button>
            ) : null}
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              {isIosDevice() ? (
                <>
                  <li>
                    Abra este site no <span className="font-medium text-foreground">Safari</span> (não no Chrome).
                  </li>
                  <li>
                    Toque em <span className="font-medium text-foreground">Compartilhar</span> (quadrado com seta para cima).
                  </li>
                  <li>
                    Role e toque em <span className="font-medium text-foreground">Adicionar à Tela de Início</span>.
                  </li>
                  <li>
                    Confirme em <span className="font-medium text-foreground">Adicionar</span>.
                  </li>
                </>
              ) : isAndroidDevice() ? (
                <>
                  <li>
                    Abra no <span className="font-medium text-foreground">Chrome</span>.
                  </li>
                  <li>
                    Toque em <span className="font-medium text-foreground">⋮</span> (canto superior direito).
                  </li>
                  <li>
                    Escolha <span className="font-medium text-foreground">Instalar app</span> ou{" "}
                    <span className="font-medium text-foreground">Adicionar à tela inicial</span>.
                  </li>
                  {canInstall ? (
                    <li>Ou use o botão Instalar OnWatch acima.</li>
                  ) : (
                    <li>Se não aparecer, atualize a página e tente de novo em alguns segundos.</li>
                  )}
                </>
              ) : (
                <>
                  <li>
                    <span className="font-medium text-foreground">Android (Chrome):</span> menu ⋮ → Instalar app /
                    Adicionar à tela inicial.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">iPhone:</span> abra no Safari → Compartilhar →
                    Adicionar à Tela de Início.
                  </li>
                </>
              )}
            </ol>
          </div>
        )}
      </Section>

      <Section icon={<Download />} title="Backup">
        <p className="text-sm text-muted-foreground">
          Os dados ficam só neste aparelho. Baixe um backup para levar a outro aparelho.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => downloadJson(buildFullBackup(), "onwatch-backup.json")}>
            <Download /> Baixar backup
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload /> Importar arquivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const r = importFile(await f.text());
                toast.success(`Importado: ${r.profiles} e-mails e ${r.services} sites`);
              } catch {
                toast.error("Arquivo inválido");
              }
            }}
          />
        </div>
      </Section>
    </div>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="panel space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-semibold [&_svg]:size-4 [&_svg]:text-primary">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="font-mono text-xs" />
    </div>
  );
}
