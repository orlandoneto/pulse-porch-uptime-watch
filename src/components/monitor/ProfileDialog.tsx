import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createProfile, updateProfile } from "@/lib/monitor/actions";
import { isValidEmail } from "@/lib/monitor/logic";
import { useAppState } from "@/lib/monitor/store";
import type { Profile } from "@/lib/monitor/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: Profile | null;
}

/** Adiciona (ou edita) um e-mail. Cada e-mail é uma área com os seus próprios sites. */
export function ProfileDialog({ open, onOpenChange, profile }: Props) {
  const { profiles } = useAppState();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(profile?.email ?? "");
    setName(profile?.name ?? "");
    setEmailAlerts(profile?.emailAlerts ?? true);
    setError(null);
  }, [open, profile]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setError("Informe um e-mail válido.");
    const dup = profiles.find((p) => p.email.toLowerCase() === email.trim().toLowerCase() && p.id !== profile?.id);
    if (dup) return setError("Esse e-mail já tem uma área aqui.");
    const data = { email: email.trim(), name: name.trim(), emailAlerts };
    if (profile) {
      updateProfile(profile.id, data);
      toast.success("Área atualizada");
    } else {
      createProfile(data);
      toast.success(`Área de ${data.email} criada`, { description: "Agora adicione os links para monitorar." });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{profile ? "Editar área" : "Adicionar e-mail"}</DialogTitle>
            <DialogDescription>
              Cada e-mail tem a sua própria área, com os seus sites, e recebe os avisos deles.
            </DialogDescription>
          </DialogHeader>
          <ProfileFields
            email={email}
            name={name}
            onEmail={(v) => {
              setEmail(v);
              setError(null);
            }}
            onName={setName}
          />
          <label className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <span>
              <span className="block text-sm font-medium">Avisos por e-mail</span>
              <span className="block text-xs text-muted-foreground">Quando um site desta área cair ou voltar.</span>
            </span>
            <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{profile ? "Salvar" : "Criar área"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileFields({
  email,
  name,
  onEmail,
  onName,
}: {
  email: string;
  name: string;
  onEmail: (v: string) => void;
  onName: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="p-email">E-mail</Label>
        <Input
          id="p-email"
          type="email"
          inputMode="email"
          autoFocus
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="voce@empresa.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="p-name">
          Nome da área <span className="font-normal text-muted-foreground">(opcional)</span>
        </Label>
        <Input id="p-name" value={name} onChange={(e) => onName(e.target.value)} placeholder="Meus clientes" />
      </div>
    </div>
  );
}
