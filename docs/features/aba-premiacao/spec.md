# Design — Aba de Premiação

**Data:** 2026-06-08
**Status:** aprovado para planejamento
**Autor:** brainstorming assistido (agent `pixel`)

---

## 1. Objetivo

Criar uma aba **Premiação** que comunica, de forma clara e confiável, como o
dinheiro arrecadado vira prêmio para os 3 primeiros do ranking. Reforça a
motivação ("vale a pena ganhar") e a transparência ("100% vira prêmio").

Feature **independente** da mecânica "palpite dia a dia" (spec separado).

### Decisões de produto (travadas)

| Decisão                      | Escolha                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Valor da inscrição           | **R$ 10 por pessoa** (acessível)                                             |
| Destino do arrecadado        | **100% revertido em prêmios** (organização não retém)                        |
| Divisão entre os 3 primeiros | **50% / 30% / 20%**                                                          |
| Camisa oficial               | **1º lugar escolhe: camisa oficial OU dinheiro**; 2º e 3º sempre em dinheiro |
| Localização                  | **Aba própria** na navegação principal                                       |

### Números de referência (~100 jogadores)

| Pote      | 🥇 1º (50%) | 🥈 2º (30%) | 🥉 3º (20%) |
| --------- | ----------- | ----------- | ----------- |
| ~R$ 1.000 | R$ 500      | R$ 300      | R$ 200      |

O 1º lugar pode trocar os R$ 500 por uma **camisa oficial** (~R$ 350-400) **+ a
diferença em dinheiro**, ou levar tudo em dinheiro.

---

## 2. Conteúdo da página (texto)

Página majoritariamente **estática/informativa**, em PT-BR, mobile-first, no
clima de Copa. Estrutura:

1. **Título + subtítulo:** "Premiação" / "Todo o dinheiro vira prêmio."
2. **Como funciona:** inscrição de **R$ 10** por participante; **100%**
   arrecadado é distribuído entre os 3 primeiros do ranking final.
3. **Tabela de divisão** (pódio visual): 1º 50%, 2º 30%, 3º 20%.
4. **Destaque do campeão:** card explicando a escolha do 1º lugar — **camisa
   oficial** (da seleção que ele escolher) **ou** o valor em dinheiro.
5. **Observações:** prêmios pagos após o término da Copa (final em 19/jul/2026);
   critério de desempate é o mesmo do ranking (já implementado, migration 0017).

### Pote ao vivo (recomendado, baixo custo)

Mostrar o pote calculado a partir do número de participantes:
`pote = nº de inscritos × R$ 10`. O número de participantes já é acessível
(tabela `participantes`, usada no ranking). Exibir como:

> "Pote atual: **87 inscritos** × R$ 10 = **R$ 870**"

Se a contagem não estiver disponível, a página degrada para o texto fixo da
regra (50/30/20) sem quebrar. **Não** é bloqueante para a v1.

---

## 3. UX / Layout (375px)

```
┌──────────────────────────────────────────┐
│  PREMIAÇÃO                         [menu] │  ← TopBar
├──────────────────────────────────────────┤
│                                          │
│        🏆  Todo o dinheiro vira prêmio    │  ← hero, accent dourado
│                                          │
│   Inscrição: R$ 10 · 100% em prêmios     │
│                                          │
│   ┌────────────────────────────────────┐ │
│   │ Pote atual                         │ │  ← card (se houver contagem)
│   │ 87 inscritos × R$ 10 =  R$ 870     │ │
│   └────────────────────────────────────┘ │
│                                          │
│   Como é dividido                        │
│   ┌──────────┬──────────┬──────────┐    │
│   │   🥇 1º   │   🥈 2º   │   🥉 3º   │    │  ← pódio
│   │   50%    │   30%    │   20%    │    │
│   │  R$ 500  │  R$ 300  │  R$ 200  │    │  ← (se pote conhecido)
│   └──────────┴──────────┴──────────┘    │
│                                          │
│   ┌────────────────────────────────────┐ │
│   │ 👕  O campeão escolhe                │ │  ← card destaque
│   │ Camisa oficial da seleção que       │ │
│   │ quiser + a diferença em dinheiro,   │ │
│   │ ou leve tudo em dinheiro.           │ │
│   └────────────────────────────────────┘ │
│                                          │
│   Prêmios pagos após a final (19/jul).   │  ← nota rodapé, xs muted
│                                          │
├──────────────────────────────────────────┤
│ [Início][Palpites][Ranking][🎁 Prêmio][Regras] │  ← BottomNav, 5 itens
└──────────────────────────────────────────┘
```

- Cores: hero/accent **dourado** (`accent #f59e0b`, troféu); pódio com destaque
  no 1º. Light mode padrão.
- Tom de copy: festivo mas direto; nada de letra miúda escondendo regra.

---

## 4. Arquitetura / arquivos

| Arquivo                                                   | Mudança                                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/app/premiacao/page.tsx`                              | **nova rota** estática                                                                          |
| `src/widgets/app-shell/ui/bottom-nav.tsx`                 | + item `Premiação` (`/premiacao`), ícone `Gift` ou `Award` — **não** `Trophy` (já é do Ranking) |
| `src/features/premiacao/components/premiacao-content.tsx` | **novo** — conteúdo da página                                                                   |
| `src/features/premiacao/lib/calcular-divisao.ts`          | **novo** — `dividirPote(pote)` → `{ primeiro, segundo, terceiro }` (50/30/20)                   |
| `src/features/premiacao/api/*` (opcional)                 | contagem de inscritos para o pote ao vivo (reusa fonte do ranking)                              |

Constantes de configuração (`src/shared/lib/constants.ts`): `VALOR_INSCRICAO = 10`,
`DIVISAO_PREMIO = { primeiro: 0.5, segundo: 0.3, terceiro: 0.2 }` — centralizadas
para não espalhar números mágicos.

### Consideração de navegação

A bottom-nav passa de 4 → **5 itens**; com o item condicional de **Admin**, um
admin veria **6 itens** em 375px (apertado). Mitigação: manter labels curtos
("Prêmio") e/ou esconder Admin atrás do menu para admins. Decisão fina fica para
a implementação; não bloqueia o design.

---

## 5. Plano de testes (cobertura total)

### Unit

- `dividirPote(pote)` → 50/30/20 corretos; arredondamento de centavos sem
  "vazar"/sobrar do pote (a soma das partes = pote); pote 0 → tudo 0.
- Constantes de configuração consistentes (somam 100%).

### Componente (Testing Library)

- `premiacao-content` renderiza: regra de divisão, valor de inscrição, card do
  campeão (camisa OU dinheiro), nota de pagamento.
- Com contagem de inscritos → mostra pote calculado e valores por colocação.
- Sem contagem → degrada para a regra em % sem quebrar.
- `bottom-nav` renderiza o item Premiação com ícone correto e marca `ativo` em
  `/premiacao` (sem colidir com o estado ativo de `/ranking`).

### E2E (Playwright)

- Navegar até `/premiacao` pela bottom-nav; conteúdo de premiação visível;
  pódio 50/30/20 presente.

### Portões

- ~100% de linhas nos módulos novos; `pnpm validate` verde.

---

## 6. Não-objetivos (YAGNI)

- Cobrança/pagamento online da inscrição (controle do dinheiro é off-app).
- Registro de quem pagou / status de pagamento por participante.
- Escolha da camisa dentro do app (é combinada off-app com o campeão).
- Premiação configurável por bolão (valores fixos nesta versão).
