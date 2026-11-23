# OnWatch — Monitor de sites

Painel PWA para monitorar se seus sites estão no ar. Sem backend: tudo roda no navegador (ou no app instalado). Áreas separadas por e-mail; avisos por notificação e, opcionalmente, por e-mail (EmailJS).

**App ao vivo:** https://pulse-porch-uptime-watch.orlandoneto.workers.dev

**Repositório:** https://github.com/orlandoneto/pulse-porch-uptime-watch

## O que faz

- Adiciona URLs e verifica de tempos em tempos (ex.: a cada 1 minuto)
- Mostra status (no ar / fora do ar), latência e disponibilidade
- Áreas por e-mail: cada perfil só vê os próprios sites
- Notificações no aparelho quando um site cai ou volta
- Avisos por e-mail via [EmailJS](https://www.emailjs.com) (opcional, free tier)
- Instala como app (PWA) no celular e no desktop

## Instalar como app

### Android (Chrome)

1. Abra o [app ao vivo](https://pulse-porch-uptime-watch.orlandoneto.workers.dev) no Chrome  
2. Menu **⋮** → **Instalar app** (ou **Adicionar à tela inicial**)  
3. Ou use o banner **Instalar** / a seção em **Ajustes**

### iPhone (Safari)

1. Abra o link no **Safari** (não no Chrome)  
2. **Compartilhar** → **Adicionar à Tela de Início** → **Adicionar**

### Desktop (Chrome / Edge)

Menu do navegador → **Instalar OnWatch** / ícone de instalação na barra de endereço.

## Uso rápido

1. Crie uma área com seu e-mail (**+ E-mail**)  
2. **Adicionar site** com a URL e o intervalo de verificação  
3. Em **Ajustes**, ative notificações (e configure EmailJS se quiser e-mail)

## Desenvolvimento local

Node.js 20+ e npm:

```sh
git clone git@github.com:orlandoneto/pulse-porch-uptime-watch.git
cd pulse-porch-uptime-watch
npm i
npm run dev
```

Outros scripts:

| Comando | Função |
|--------|--------|
| `npm run build` | Build de produção |
| `npm test` | Testes (Vitest) |
| `npm run cf:build` | Build para Cloudflare Workers |
| `npm run cf:deploy` | Deploy no Worker (após o build) |

## Deploy (Cloudflare)

```sh
npm run cf:build
# ajustar o name em .output/server/wrangler.json se necessário
npx wrangler deploy --config .output/server/wrangler.json
```

Worker publicado: `pulse-porch-uptime-watch` na conta Cloudflare do `orlandoneto`.

## Stack

- Vite + TanStack Start / React  
- Cloudflare Workers (Nitro)  
- PWA (`manifest.webmanifest` + service worker `notify-sw.js`)  
- Estado e checagens no cliente (localStorage)

## Licença

Uso privado / interno da ON Tech, salvo indicação contrária no repositório.
