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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addService, updateService } from "@/lib/monitor/actions";
import { runCheck } from "@/lib/monitor/engine";
import { INTERVAL_OPTIONS, normalizeUrl } from "@/lib/monitor/logic";
import { useCurrentProfile } from "@/lib/monitor/store";
import type { Service } from "@/lib/monitor/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

export function ServiceDialog({ open, onOpenChange, service }: Props) {
  const me = useCurrentProfile();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setIntervalSec] = useState("60");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? "");
    setUrl(service?.url ?? "");
    setIntervalSec(String(service?.intervalSec ?? 60));
    setError(null);
  }, [open, service]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("Digite um endereço válido, ex: meusite.com.br");
      return;
    }
    const finalName = name.trim() || new URL(normalized).hostname;
    const data = { name: finalName, url: normalized, intervalSec: Number(interval) };
    if (service) {
      updateService(service.id, data);
      void runCheck(service.id);
      toast.success("Site atualizado");
    } else {
      if (!me) return;
      const created = addService({ ...data, ownerId: me.id });
      void runCheck(created.id);
      toast.success(`${finalName} adicionado`, { description: "Primeira verificação em andamento." });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{service ? "Editar site" : "Adicionar site"}</DialogTitle>
            <DialogDescription>
              Será verificado automaticamente. Se cair, o aviso vai para {me?.email ?? "o seu e-mail"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="svc-url">Endereço (URL)</Label>
            <Input
              id="svc-url"
              placeholder="https://meusite.com.br"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              className="font-mono"
              inputMode="url"
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="svc-name">Nome</Label>
            <Input id="svc-name" placeholder="Loja virtual" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Verificar a cada</Label>
            <Select value={interval} onValueChange={setIntervalSec}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{service ? "Salvar" : "Adicionar e verificar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
