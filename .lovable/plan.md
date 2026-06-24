
# Limpeza de dívida técnica — Flare Hub

Vou agrupar os 9 pontos em **3 ondas** por risco. Posso executar tudo, mas algumas mudanças (bucket privado) podem quebrar URLs em produção e merecem ser feitas isoladamente.

---

## Onda 1 — Refactors seguros (sem risco runtime)

1. **`POST_PLAN_LABELS` → `lib/plans.ts`**
   Mover para `PLAN_BADGES` exportado; remover duplicação em `CreatorProfile.tsx`.

2. **Remover `as any` em queries Supabase (62 ocorrências)**
   Tabelas (`affiliate_links`, `affiliate_requests`, `affiliate_referrals`, `platform_settings`, `live_chat_messages`, `post_comments`, `creator_lives`, etc.) já existem em `types.ts`. Tirar os `as any` em `.from(...)` e tipar `data` corretamente.
   Onde houver RPCs faltando no schema gerado (ex.: `record_checkout_abandoned`), manter `as any` localizado e comentar o motivo.

3. **Tipar `plans` em `CreatorProfile.tsx`**
   Criar `type PlanCard = { name; planKey; emoji; desc; perks; price; popular }` e eliminar os `as any` em `plans[i] as { planKey: string }`.

4. **Flag única de pagamento (`PAYMENTS_MOCK`)**
   Adicionar a `lib/constants.ts`:
   ```ts
   export const PAYMENTS_MOCK = import.meta.env.VITE_PAYMENTS_MOCK === "true";
   ```
   Usar em `PixPaymentModal` e qualquer caller para alternar entre mock e SyncPay real. Sem mudar o backend ainda.

5. **`category` no creator do feed**
   Já adicionado ao tipo; expor no `CreatorCard`/feed quando útil (opcional, pequena mudança visual).

---

## Onda 2 — Segurança runtime (mudanças visíveis, baixo risco)

6. **CSP básico em `index.html`**
   Meta tag `Content-Security-Policy` permitindo: `self`, Supabase, Lovable, Facebook Pixel, YouTube/Twitch (lives), fontes Google. `frame-ancestors 'none'`.

---

## Onda 3 — Privatizar bucket `content` (alto risco, faço em migration separada)

7. **`content` público → privado + signed URLs**
   - `supabase--storage_update_bucket(name="content", public=false)`.
   - Criar hook `useSignedMediaUrl(path)` que chama `supabase.storage.from('content').createSignedUrl(path, 3600)`.
   - Substituir `<img src={post.media_url}/>` por componente que resolve URL assinada quando o bucket detecta path interno do `content`.
   - **Risco:** URLs públicas existentes param de funcionar imediatamente; precisa fazer junto.
   - Recomendo executar **só após confirmar** que não há dependentes externos das URLs públicas.

---

## Fora de escopo agora (deferidos com nota)

8. **Notificações por trigger em escala**
   Atual `notify_new_post` faz INSERT por assinante dentro de trigger. Funciona até ~milhares. Quando crescer, mover para edge function batched ou usar uma tabela `notification_outbox`.

9. **Limpeza `pages` vs `routes`**
   `src/routes/` não existe mais — nada a fazer.

---

## Plano de execução

- Onda 1 numa única passada (tudo TS, validado com `tsgo --noEmit`).
- Onda 2 logo após.
- Onda 3 **só com seu OK explícito** — vou pausar antes de mudar o bucket.

Posso começar?
