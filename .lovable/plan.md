## Objetivo
Resolver o 403 restante nas consultas de `posts` e `creator_lives`.

## Diagnóstico
- Os `GRANTs` das tabelas `posts` e `creator_lives` já foram aplicados e validados.
- O corpo real da resposta 403 agora diz: `permission denied for function plan_rank`.
- As políticas RLS dessas tabelas chamam `public.plan_rank(text)` para comparar níveis de plano (`free`, `fan`, `superfan`, `vip`).
- A função existe, mas `anon` e `authenticated` não têm permissão de execução:
  - `anon_execute: false`
  - `authenticated_execute: false`
  - `service_execute: true`

## Plano de implementação
1. Criar uma migração Supabase mínima para permitir execução de `public.plan_rank(text)` por:
   - visitantes, porque posts/lives gratuitos podem ser lidos publicamente
   - usuários autenticados, porque assinantes/criadores precisam passar pelas políticas RLS
2. Não alterar a lógica da função nem as políticas de acesso de posts/lives.
3. Validar novamente os privilégios da função após a migração.
4. Recarregar/testar a página do criador para confirmar que os GETs de `posts` e `creator_lives` deixam de retornar 403.

## SQL previsto
```sql
GRANT EXECUTE ON FUNCTION public.plan_rank(text) TO anon;
GRANT EXECUTE ON FUNCTION public.plan_rank(text) TO authenticated;
```

## Observação
O POST 422 para `capig.datah04.com` é do Meta/CAPI e é separado do Supabase. Ele não causa o 403 de `posts`/`creator_lives`; posso investigar depois se necessário.