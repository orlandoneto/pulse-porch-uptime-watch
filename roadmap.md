# Roadmap
- [x] Painel de monitoramento com verificação periódica, avisos push/e-mail, instalável (PWA)
- [x] Trocar perfis admin/visualização por áreas por e-mail (botão +), cada área com seus próprios sites
- [x] Tela **Uso / Cotas** (`/uso`) + `GET /api/usage`: Cloudflare Workers, Vercel Hobby, Render e checagens HTTP com status real, limiares 70%/90%
- [ ] Publicar o módulo de uso no Worker existente (push + deploy dependem do OK do Orlando; sem DNS novo)
- [ ] Cron de verificação de cotas (esboço; hoje a consulta é ao vivo no carregamento com cache curto)
