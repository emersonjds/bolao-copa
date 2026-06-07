# Spec — Próximos Jogos agrupados por dia (Home)

**Data:** 2026-06-07
**Autor:** PIXEL (UX/UI)
**Status:** pronto para implementar
**Arquivo-alvo:** `src/features/partidas/components/proximos-jogos.tsx`

---

## 1. Regra de negócio — seleção e agrupamento

### Definição de "match-day"

Um match-day é uma data calendário (no fuso `America/Sao_Paulo`, BRT UTC-3) que contenha pelo menos uma partida com `status !== "encerrada"`. Partidas `ao-vivo` são não-encerradas e pertencem ao match-day corrente.

### Algoritmo

```
1. Filtrar: partidas onde status !== "encerrada"
2. Ordenar: por dataHora ASC
3. Agrupar: por data-BRT (yyyy-mm-dd usando Intl.DateTimeFormat com timeZone "America/Sao_Paulo")
4. Tomar: as primeiras 2 chaves de data (os 2 primeiros match-days)
5. Exibir: todos os jogos de cada um desses 2 dias, na ordem ASC de horário
```

O fuso deve ser fixado em `America/Sao_Paulo` explicitamente — não usar o fuso do navegador, pois o público-alvo é brasileiro e a Copa acontece em fuso diferente (os horários dos jogos já estão em UTC no banco).

### Casos de borda

| Situação | Comportamento |
|---|---|
| Hoje sem jogos, mas amanhã tem | Hoje é ignorado. Os 2 primeiros match-days com jogos são exibidos. |
| Só 1 match-day restante (ex.: dia da Final) | Exibe apenas esse dia, sem o segundo grupo. |
| Algum jogo ao-vivo | Entra no grupo do dia corrente, card com `StatusPill` "Ao vivo". |
| Nenhum jogo futuro ou ao-vivo (pós-Copa) | Estado vazio — ver seção 2.4. |
| Dados ainda carregando | Skeleton — ver seção 2.5. |
| Erro de rede | Mensagem de erro — ver seção 2.6. |

---

## 2. Layout mobile-first

### 2.1 Estrutura geral

```
<ul role="list" aria-label="Próximos jogos por dia">        ← lista de grupos
  <li>                                                       ← grupo do dia 1
    <DayHeader />                                            ← h3 + badge opcional
    <ul role="list">                                         ← jogos do dia
      <CardJogo />
      <CardJogo />
    </ul>
  </li>
  <li>                                                       ← grupo do dia 2
    <DayHeader />
    <ul role="list">
      <CardJogo />
    </ul>
  </li>
</ul>
```

O `<section aria-labelledby="proximos-jogos-titulo">` e o `<h2>` já existem em `page.tsx` — o componente não os duplica. Os `DayHeader` são `<h3>` para manter hierarquia correta (h2 → h3).

### 2.2 DayHeader — cabeçalho do dia

**Formato do rótulo de data (PT-BR):**

| Condição | Texto exibido |
|---|---|
| Data = hoje | `HOJE · QUI, 12 JUN` |
| Data = amanhã | `AMANHÃ · SEX, 13 JUN` |
| Qualquer outro dia | `SÁB, 14 JUN` |

Dias da semana abreviados: DOM, SEG, TER, QUA, QUI, SEX, SÁB (uppercase, `Intl.DateTimeFormat` weekday: "short" em pt-BR já retorna isso — aplicar `.toUpperCase()`).

**Badge de contagem:** exibir somente quando o dia tiver 3 ou mais jogos.
- Texto: `"4 jogos"` (singular raro na Copa, plural é a norma)
- Visual: pílula `bg-brand-100 text-brand-700`, `text-[11px] font-semibold px-2 py-0.5 rounded-full`
- Para 1 ou 2 jogos: sem badge (o visual do card já é suficiente; badge adicionaria ruído)

**Tokens e espaçamento:**

```
<div class="flex items-center justify-between mb-3">
  <h3 class="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
    HOJE · QUI, 12 JUN
  </h3>
  <!-- badge condicional: apenas quando jogos >= 3 -->
  <span class="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
    4 jogos
  </span>
</div>
```

### 2.3 Espaçamentos

| Breakpoint | Entre grupos de dias | Entre cards do mesmo dia |
|---|---|---|
| 375px | `gap-6` (24px) | `gap-3` (12px) |
| 768px+ | `gap-8` (32px) | `gap-3` (12px) |

Os cards `CardJogo` existentes não mudam internamente — apenas o container muda.

Estrutura com classes Tailwind:

```
<ul class="flex flex-col gap-6 sm:gap-8">
  <li>
    <DayHeader />
    <ul class="flex flex-col gap-3">
      ...cards...
    </ul>
  </li>
</ul>
```

### 2.4 Estado vazio (pós-Copa)

Exibir quando não existe nenhuma partida não-encerrada.

```
<div class="flex flex-col items-center gap-2 py-8 text-center">
  <span class="text-3xl" aria-hidden="true">🏆</span>
  <p class="text-sm font-semibold text-foreground">A Copa 2026 chegou ao fim.</p>
  <p class="text-sm text-muted-foreground">Obrigado por jogar!</p>
</div>
```

(Emoji de troféu é aceitável aqui por ser elemento decorativo com `aria-hidden`.)

### 2.5 Estado de carregamento (skeleton)

Manter o skeleton atual (3 cards pulsando) — funciona bem. Opcional: adicionar um skeleton de DayHeader acima do primeiro grupo para consistência visual, mas não é obrigatório.

### 2.6 Estado de erro

Manter a mensagem atual: `"Não foi possível carregar os jogos."` — é suficiente.

---

## 3. Relação com ProximoJogoDestaque

**Recomendação: manter o jogo na lista mesmo que apareça no Destaque.**

Motivo: os dois componentes têm propósitos distintos. O `ProximoJogoDestaque` é um card de ação imediata (borda dourada, CTA "Dar palpite" em destaque) que aparece somente quando há jogo nas próximas 24h — sua função é urgência/atenção. O `ProximosJogos` é contexto e agenda — o usuário espera ver todos os jogos do dia lá. Sumir com um jogo da lista quebraria a expectativa de completude.

A redundância visual é aceitável porque:
- O Destaque está acima da seção com título distinto (`aria-label` diferente)
- O card na lista mostra o mesmo jogo em formato compacto, sem o destaque visual da borda dourada
- Em dias com múltiplos jogos (comum na fase de grupos), o Destaque só cobre 1; a lista cobre todos

**Não é necessária nenhuma lógica de exclusão entre os dois.**

---

## 4. Relação com "Ver agenda completa"

O link para `/calendario` já existe em dois lugares em `page.tsx`:
- Inline (visível em `sm+`, `hidden sm:block`)
- Botão outline abaixo da lista (visível só em mobile, `sm:hidden`)

Nenhuma mudança necessária. A lista agrupada por 2 match-days continua sendo um recorte — o link leva ao calendário completo, o que faz sentido semanticamente.

---

## 5. Acessibilidade

| Requisito | Implementação |
|---|---|
| Hierarquia de headings | `h2` ("Próximos jogos") em `page.tsx` → `h3` (dia) dentro do componente |
| Landmark de seção | O `<section aria-labelledby="proximos-jogos-titulo">` já existe em `page.tsx`; os grupos de dia não precisam de `<section>` próprio — `<li>` é suficiente |
| Times `<time>` | `CardJogo` já usa `<time dateTime={partida.dataHora}>` — manter |
| Status ao-vivo | `StatusPill` já tem o ponto pulsante com `aria-hidden` — manter |
| Badge de contagem | Texto visível já é descritivo ("4 jogos"); sem necessidade de `aria-label` extra |
| Foco visível | Nenhum elemento interativo novo; CardJogo com "Fazer palpite" já tem foco nativo do botão/link |
| Contraste do DayHeader | `text-muted-foreground` sobre `background`: verificar que o token satisfaz 4.5:1 no light mode (gray-500 sobre white = 7.5:1 — ok) |

---

## 6. Decisão de implementação — onde fazer o agrupamento

O agrupamento deve ser feito **dentro do componente** `ProximosJogos`, em um utilitário puro extraível:

```ts
// src/features/partidas/lib/agrupar-por-dia.ts
export function agruparPorMatchDay(partidas: Partida[]): Map<string, Partida[]>
```

A função recebe o array já filtrado (não-encerradas) e retorna um `Map<string, Partida[]>` com chave `"yyyy-mm-dd"` em BRT e valor com os jogos ordenados por horário. O componente itera as primeiras 2 entradas do Map.

Isolar em lib facilita o teste unitário da regra sem montar o componente.

---

## 7. Textos da UI (PT-BR)

| Contexto | Texto |
|---|---|
| Header — hoje | `HOJE · QUI, 12 JUN` |
| Header — amanhã | `AMANHÃ · SEX, 13 JUN` |
| Header — outro dia | `SÁB, 14 JUN` |
| Badge | `N jogos` (ex.: "3 jogos", "4 jogos") |
| Estado vazio — linha 1 | `A Copa 2026 chegou ao fim.` |
| Estado vazio — linha 2 | `Obrigado por jogar!` |
| Erro | `Não foi possível carregar os jogos.` (existente — manter) |
| Skeleton aria | `aria-busy="true"` (existente — manter) |
