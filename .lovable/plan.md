## Objetivo
Corrigir os erros 403 nas consultas de `creator_lives` e `posts`, e o 422/erro ao iniciar live, sem abrir dados privados indevidamente.

## Diagnóstico
- As políticas RLS de `creator_lives` e `posts` existem e parecem permitir os acessos esperados.
- Porém não há nenhum `GRANT` explícito para `anon`, `authenticated` ou `service_role` nessas duas tabelas.
- No Supabase/PostgREST, sem `GRANT`, a API REST retorna 403 mesmo quando a RLS permitiria a operação.

## Plano de implementação
1. Criar uma migração Supabase para adicionar permissões Data API nas tabelas afetadas:
   - `creator_lives`
     - leitura pública apenas para lives gratuitas, controlada pela RLS existente
     - leitura/criação/edição/remoção para usuários autenticados, controlada pela RLS existente
     - acesso total para `service_role`
   - `posts`
     - leitura pública apenas para posts gratuitos, controlada pela RLS existente
     - leitura/criação/edição/remoção para usuários autenticados, controlada pela RLS existente
     - acesso total para `service_role`
2. Não alterar as regras RLS atuais de assinatura/planos; apenas restaurar o acesso da Data API.
3. Após a migração, validar novamente que os grants aparecem para as duas tabelas.
4. Se o 422 persistir depois do 403, investigar a requisição específica que ainda falha, porque o 422 pode ser consequência do bloqueio anterior ou de payload inválido na criação da live.

## SQL previsto
```sql
GRANT SELECT ON public.creator_lives TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_lives TO authenticated;
GRANT ALL ON public.creator_lives TO service_role;

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
```

## Observação
Os avisos do Facebook Pixel sobre `form-action 'self'` são separados dos erros Supabase; posso tratar o CSP depois, mas não é a causa do erro de lives/posts.