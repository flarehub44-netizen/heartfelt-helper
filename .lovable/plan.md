

## Melhorar conversao no Feed e PixPaymentModal

### 1. Posts locked com contexto especifico (Feed.tsx)

**Problema**: Posts locked mostram apenas "Conteudo exclusivo" generico.

**Solucao**: Usar o `plansMap` ja disponivel para mostrar o nome do plano e preco diretamente no overlay do post locked. Adicionar frase de urgencia.

Alterar o bloco locked (linhas 364-377) para:
- Mostrar o nivel do plano necessario (ex: "Exclusivo para Fas" / "Super Fa" / "VIP")
- Mostrar o preco (ex: "A partir de R$ 9,90/mes")
- Adicionar badge de urgencia sutil ("Vagas limitadas" ou icone de fogo)
- Botao com texto mais especifico: "Desbloquear por R$ X,XX/mes"

### 2. PixPaymentModal — selo de seguranca e countdown visual

**Problema**: Formulario sem confianca visual; timer de 30min apenas em texto.

**Solucao** no `PixPaymentModal.tsx`:

**Step "form"**:
- Adicionar selo de seguranca abaixo do botao: icone Shield + "Pagamento seguro via Pix · Dados protegidos"
- Adicionar icones de confianca (Lock + ShieldCheck) junto ao disclaimer do CPF

**Step "pix"**:
- Substituir o texto estatico "30 minutos" por um countdown visual usando `useState` + `useEffect` com `setInterval` de 1s
- Exibir minutos:segundos em destaque com cor que muda (verde → amarelo → vermelho nos ultimos 5min)
- Manter a barra de progresso visual (componente `Progress` ja existente)

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/pages/Feed.tsx` | Overlay de posts locked com plano/preco/urgencia |
| `src/components/PixPaymentModal.tsx` | Selo seguranca + countdown visual de 30min |

### Detalhes tecnicos

- **Feed locked overlay**: Usa `plansMap[post.creator.id]` para exibir `plan_name` e `price`. Map de labels: `{ fan: "Fas", superfan: "Super Fas", vip: "VIP" }`
- **Countdown**: Estado `secondsLeft` inicializado em 1800 (30min), decrementado via `setInterval`. Limpar interval no cleanup. Usar `Progress` com `value={(secondsLeft/1800)*100}`
- **Icones**: Importar `Shield`, `ShieldCheck`, `Clock`, `Flame` do lucide-react

