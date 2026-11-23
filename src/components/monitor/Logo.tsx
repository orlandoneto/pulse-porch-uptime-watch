import { Activity } from "lucide-react";

export function Logo({ name = "OnWatch" }: { name?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-md border border-success/30 bg-success/10 text-success">
        <Activity className="size-4" strokeWidth={2.5} />
      </span>
      <span className="font-mono text-base font-semibold tracking-tight text-foreground">{name}</span>
    </span>
  );
}
