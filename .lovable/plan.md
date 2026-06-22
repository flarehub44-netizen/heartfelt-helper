## Visão geral

Construir o MVP da plataforma de monetização de conteúdo (estilo OnlyFans/Patreon) para o mercado brasileiro, com tema **dark premium**, pagamentos Pix em modo mock e foco em conteúdo geral (sem NSFW).

A base usa **Lovable Cloud** (Supabase gerenciado) para auth, banco e armazenamento de mídia, e **TanStack Start** para rotas e server functions.

---

## Identidade visual

- **Tema**: dark premium, fundo near-black com gradientes sutis em violeta/rosa magenta (paleta "creator economy" — diferente do azul corporativo).
- **Acento principal**: rosa/magenta `oklch(0.65 0.25 350)` com glow.
- **Tipografia**: `Plus Jakarta Sans` (UI) + `Instrument Serif` (headings de destaque, ar editorial).
- **Componentes**: cards com bordas suaves, blur/glass em overlays, badges de camada com gradiente por tier (Fã = neutro, Super Fã = violeta, VIP = dourado).
- **shadcn/ui** + tokens semânticos em `src/styles.css` (sem hex hardcoded em componentes).

---

## Arquitetura de rotas

```
/                              Landing pública (hero, criadores em destaque, como funciona, CTA)
/explorar                      Diretório de criadores (busca, categorias)
/c/$handle                     Perfil público do criador (bio, tiers, preview)
/auth                          Login / cadastro (email+senha)
/_authenticated/
  feed                         Feed personalizado das assinaturas ativas
  mensagens                    Lista de conversas (DMs)
  mensagens/$conversationId    Conversa individual
  configuracoes                Perfil, senha, notificações
  carteira                     Saldo, transações, afiliados
  assinaturas                  Gerenciar assinaturas ativas
  estudio/                     Painel do criador
    estudio/index              Dashboard (receita, assinantes, posts)
    estudio/posts              Gerenciar posts (criar/editar)
    estudio/posts/novo
    estudio/tiers              Configurar Fã/Super Fã/VIP (preço, benefícios)
    estudio/assinantes         Lista de fãs e MRR
    estudio/afiliados          Link de afiliado, comissões
```

Rotas autenticadas ficam sob `_authenticated/` (gate gerenciado pela integração Supabase).

---

## Banco de dados (Lovable Cloud)

Tabelas no schema `public` (todas com GRANTs + RLS):

- **`profiles`** — `id (auth.users)`, `handle`, `display_name`, `bio`, `avatar_url`, `cover_url`, `is_creator`.
- **`user_roles`** — `user_id`, `role` (enum: `admin`, `creator`, `user`); função `has_role()` SECURITY DEFINER.
- **`tiers`** — `id`, `creator_id`, `slug` (`fan|super_fan|vip`), `name`, `price_brl_cents`, `benefits[]`, `sort_order`.
- **`subscriptions`** — `id`, `fan_id`, `creator_id`, `tier_id`, `status` (`active|canceled|past_due`), `started_at`, `current_period_end`.
- **`posts`** — `id`, `creator_id`, `title`, `body`, `media_urls[]`, `min_tier_id` (acesso requerido), `published_at`.
- **`post_likes`** — `post_id`, `user_id`.
- **`post_comments`** — `id`, `post_id`, `user_id`, `body`, `created_at`.
- **`conversations`** — `id`, `creator_id`, `fan_id`, `last_message_at`.
- **`messages`** — `id`, `conversation_id`, `sender_id`, `body`, `media_url`, `created_at`, `read_at`.
- **`payments`** — `id`, `user_id`, `subscription_id`, `amount_brl_cents`, `method` (`pix_mock`), `status`, `pix_qr_payload`, `expires_at`, `paid_at`.
- **`affiliate_links`** — `id`, `user_id`, `code` (único).
- **`affiliate_referrals`** — `affiliate_user_id`, `referred_user_id`, `commission_brl_cents`, `payment_id`.
- **Storage buckets**: `avatars` (público), `posts` (privado, signed URLs com checagem de tier), `messages` (privado).

RLS principal:
- Posts visíveis apenas se o usuário tiver `subscription.active` com `tier.sort_order >= post.min_tier.sort_order` (ou for o próprio criador).
- DMs apenas entre os 2 participantes.
- `payments` e `affiliate_referrals` apenas para o dono.

---

## Pagamentos Pix (mock)

Server function `createPixCharge(subscriptionId)`:
1. Cria registro em `payments` com `status='pending'`, gera payload Pix copia-e-cola fake e QR code (data URL placeholder).
2. UI mostra modal com QR + código + botão **"Simular pagamento"** (apenas em ambiente mock).
3. Ao clicar, server function `confirmPixMockPayment(paymentId)` marca como `paid`, ativa `subscription`, dispara comissão de afiliado (se houver `referrer` no perfil).

Comissão de afiliado: 20% do primeiro pagamento, registrada em `affiliate_referrals`.

Toda lógica isolada em `src/lib/payments.functions.ts` para trocar por Mercado Pago/Asaas depois.

---

## Funcionalidades por iteração

**Iteração 1 (este plano):**
- Setup design system dark premium
- Auth (email+senha) + perfis + papéis (creator/user)
- Landing + diretório `/explorar` + perfil público `/c/$handle`
- Tiers (CRUD pelo criador)
- Assinatura com fluxo Pix mock
- Feed exclusivo com gate de tier
- Posts (criar com texto + upload de imagem)
- DM básico (texto)
- Carteira com transações
- Programa de afiliados (link único + tracking via `?ref=`)
- Painel do criador (métricas básicas: MRR, assinantes, posts)

**Fora do escopo desta iteração** (avisarei e podemos fazer depois):
- Pagamentos Pix reais (precisa Mercado Pago/Asaas)
- Notificações por email
- Mensagens com mídia/áudio
- Live streaming
- Saque para conta bancária do criador
- App mobile

---

## Detalhes técnicos

- **Stack**: TanStack Start + React 19 + Tailwind v4 + shadcn/ui + Lovable Cloud (Supabase).
- **Data fetching**: TanStack Query com `ensureQueryData` em loaders + `useSuspenseQuery` em componentes.
- **Server functions** em `src/lib/*.functions.ts` (auth via `requireSupabaseAuth`).
- **Realtime** para DMs via `supabase.channel()` (subscribe a `messages` por `conversation_id`).
- **Validação**: Zod em todos os inputs (cadastro, posts, mensagens, valores monetários).
- **Roles**: tabela `user_roles` separada + função `has_role()` SECURITY DEFINER (nunca em `profiles`).
- **Storage de mídia de posts**: signed URLs geradas por server function que valida tier antes de assinar.
- **Fontes**: `@fontsource/plus-jakarta-sans` + `@fontsource/instrument-serif` via `bun add`.

---

## Próximo passo

Ao aprovar este plano, vou habilitar Lovable Cloud (necessário para auth/DB/storage) e começar pelo design system + auth + landing, depois evoluir para criador/feed/pagamentos.