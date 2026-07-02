Plano para corrigir a live que fica presa em “Conectando à transmissão...”:

1. Corrigir o fluxo do criador ao iniciar live
   - Depois de criar uma live nativa, garantir que o criador permaneça/entre automaticamente na aba “Lives”.
   - Renderizar imediatamente o `NativeLivePlayer` como host para abrir a câmera/microfone e enviar o sinal `host-ready`.
   - Evitar que a live fique marcada como “ao vivo” no banco sem uma sessão de transmissão ativa no navegador do criador.

2. Melhorar o estado do espectador
   - Se o espectador abrir uma live nativa mas o criador não estiver com a câmera/transmissão ativa, trocar o texto infinito “Conectando à transmissão...” por uma mensagem clara: “Aguardando o criador iniciar a câmera”.
   - Manter tentativa automática de reconexão quando o host ficar pronto.
   - Não exibir como erro fatal quando é apenas ausência temporária do host.

3. Tornar o WebRTC mais robusto
   - Reenviar o sinal de entrada do espectador enquanto ele aguarda, em intervalos curtos e controlados.
   - Adicionar tratamento de falhas de conexão para voltar ao estado de espera em vez de ficar em tela preta.
   - Garantir que o vídeo remoto chame `play()` ao receber a stream, reduzindo casos em que o navegador recebe a transmissão mas não inicia reprodução.

4. Melhorar o controle de encerramento
   - Quando o criador encerrar a live, parar tracks locais, fechar peers e atualizar o status para `ended`.
   - Para espectadores, ao receber encerramento/desconexão, mostrar estado informativo em vez de permanecer conectando.

Arquivos previstos:

```text
src/components/NativeLivePlayer.tsx
src/pages/CreatorProfile.tsx
```

Não vou alterar regras de plano/assinatura nem permissões do Supabase, porque a live já está sendo salva e o problema agora é a sessão de transmissão em tempo real.