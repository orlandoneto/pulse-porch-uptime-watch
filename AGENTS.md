<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- No backend: all data lives in the browser's localStorage via `src/lib/monitor/store.ts` (useSyncExternalStore); the user explicitly asked for client-only.
- Uptime checks use `fetch(..., { mode: "no-cors" })` from `src/lib/monitor/check.ts`; only reachability is detectable, not HTTP status codes, because browsers hide cross-origin responses.
- Visibility/alert rules live as pure functions in `src/lib/monitor/logic.ts` (covered by `src/test/monitor-logic.test.ts`): each email "area" (Profile) owns its services via `ownerId`; no login, no roles.
- Email alerts go through EmailJS's browser REST API with keys stored in settings, since there is no server to hold secrets.
- `public/notify-sw.js` is a notification-only service worker (no fetch handler, no caching), registered only in published builds via `src/lib/monitor/sw-register.ts`; mobile browsers need a SW registration to show notifications.

## Módulo de uso / cotas (exceção no servidor)

- `/uso` e `GET /api/usage` (`src/routes/uso.tsx`, `src/routes/api/usage.ts`, `src/lib/usage/*.server.ts`) são a **única** parte que roda no servidor. Isso é necessário porque tokens de API não podem ir para o navegador e o `no-cors` não enxerga status 200/301.
- O uptime de sites continua **somente no cliente**. Não migre `src/lib/monitor/*` para o servidor sem um pedido explícito.
- Tokens ficam apenas em `.dev.vars` (gitignored) ou em secrets do Worker; nunca use `VITE_*` com segredo. Só os nomes das variáveis aparecem em `.dev.vars.example`, no README e no relatório.
- Limiares em `src/lib/usage/thresholds.ts`: `<70%` ok, `>=70%` atenção, `>=90%` crítico. Testes em `src/test/usage-*.test.ts`.
- As consultas aos provedores têm cache curto (15 s) porque o próprio OnWatch consome a cota de 100.000 requests/dia do Cloudflare. Cron é apenas esboço futuro; este módulo não faz deploy, DNS nem altera billing.
