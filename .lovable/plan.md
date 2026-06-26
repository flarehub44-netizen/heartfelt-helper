## Plano para corrigir a live que inicia mas não aparece

1. **Garantir que a nova live entre imediatamente na tela**
   - Ajustar a criação da live para retornar o registro criado pelo Supabase.
   - Atualizar o cache local de `creatorLives` com essa nova live, sem depender apenas do refetch.
   - Ao criar pelo perfil, trocar para a aba `Lives` e manter a lista já atualizada.

2. **Corrigir ordenação/listagem de lives sem data agendada**
   - A live iniciada agora fica com `scheduled_at` vazio; vou ajustar a consulta para ordenar por `created_at` e priorizar lives `live`, evitando que ela suma por ordenação/null.

3. **Adicionar estado visual de inicialização do player**
   - Quando o card da live aparecer, o player nativo deve mostrar claramente “Preparando câmera e microfone...” até o navegador pedir permissão.
   - Se a câmera/microfone falharem, mostrar erro dentro do player em vez de parecer que não aconteceu nada.

4. **Ajustar ação do Dashboard**
   - Ao iniciar pelo Dashboard, redirecionar para o perfil na aba `Lives` e garantir que a live recém-criada apareça mesmo antes do refetch terminar.

5. **Validar o fluxo principal**
   - Testar: clicar em `Iniciar agora` no perfil, confirmar que o card da live aparece, o player monta e a UI pede câmera/microfone ou mostra erro claro.