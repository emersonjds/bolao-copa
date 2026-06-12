# Spec — Grupos da Copa

**Data:** 2026-06-12 · **Status:** aprovado, a implementar

## Problema

Hoje o app mostra o "jogo do dia" e o histórico de palpites de cada participante, mas **não
tem uma visão dos grupos da Copa**: classificação das seleções, pontuação dos times e histórico
de resultados. Sem isso, os participantes ficam sem referência ("quanto foi mesmo o jogo?") e o
app perde o clima de Copa de verdade.

## Objetivo

Adicionar uma visão **Grupos da Copa** (read-only) com:

1. **Tabela de classificação por grupo** — pontos das seleções (3 vitória / 1 empate / 0 derrota),
   jogos, saldo de gols, com destaque das zonas de classificação.
2. **Histórico de jogos do grupo** — placares dos jogos encerrados + próximos agendados, para
   ninguém ficar em dúvida sobre o resultado.

**Não-objetivos (YAGNI):** chaveamento do mata-mata, critério oficial de desempate por confronto
direto, edição de qualquer dado. Tudo é derivado do que já existe.

## Garantia de segurança da pontuação

> A classificação dos **times** (3/1/0) é **completamente separada** da pontuação dos **palpites**
> (`apurar_pontos()` no Supabase, regra 5/4/3/2/0 × peso da fase). Esta feature **só lê** partidas
> e **não toca** em palpites, `pontos`, RPCs nem migrations. Risco de regressão na pontuação: zero.

## Arquitetura

100% no cliente, sobre os dados que `usePartidas()` já carrega. **Sem query/RPC/migration nova.**

### Slice nova — `src/features/grupos/`

```
src/features/grupos/
├── lib/
│   ├── derivar-classificacao.ts        # função pura, sem deps de UI
│   └── derivar-classificacao.test.ts   # testes unitários (vitest)
├── components/
│   ├── grupos-content.tsx              # orquestra: usePartidas + useMemo + estados
│   ├── tabela-grupo.tsx                # classificação de 1 grupo
│   └── historico-jogos-grupo.tsx       # jogos daquele grupo (read-only, sem CTA)
└── index.ts                            # export público: GruposContent
```

### Contrato da derivação — `lib/derivar-classificacao.ts`

```ts
export interface LinhaClassificacao {
  selecao: Selecao;
  posicao: number; // 1..4, já com a ordenação aplicada
  pontos: number; // P  (vitória=3, empate=1)
  jogos: number; // J  (só status "encerrada" com placar)
  vitorias: number; // V
  empates: number; // E
  derrotas: number; // D
  golsPro: number; // GP
  golsContra: number; // GC
  saldoGols: number; // SG = GP - GC
}

export interface ClassificacaoGrupo {
  grupo: string; // "A".."L" — vem do banco, sem hardcode
  linhas: LinhaClassificacao[]; // 4 seleções já ordenadas
  jogos: Partida[]; // todos os jogos do grupo (qualquer status), p/ histórico
  finalizado: boolean; // true quando todos os jogos do grupo estão "encerrada"
}

export function derivarClassificacao(partidas: Partida[]): ClassificacaoGrupo[];
```

**Algoritmo:**

1. `filter(p => p.fase === "grupos" && p.grupo !== null)`.
2. Agrupa por `grupo` num `Map<string, Partida[]>`.
3. Por grupo (com um `Map<selecaoId, linha>` **local**, nunca compartilhado entre grupos):
   - **Enumera os times** percorrendo _todos_ os jogos do grupo (qualquer status) → time aparece
     mesmo antes de jogar.
   - **Acumula stats** só de `status === "encerrada"` **e** `golsMandante !== null` (guarda
     defensiva contra apuração pendente). Jogos `ao-vivo`/`agendada` não contam (tabela não oscila).
   - **Ordena linhas:** `P desc → SG desc → GP desc → selecao.nome asc`, e atribui `posicao`.
   - `finalizado = jogos.every(j => j.status === "encerrada")`.
4. **Ordena grupos** por `grupo.localeCompare` → A, B, …, L emergem do dado (12 grupos, 48 times).

> **Desempate:** a FIFA usa confronto direto / fair play. Para o bolão usamos saldo → gols pró →
> nome (alfabético) — suficiente e honesto; documentado aqui e no código.

## UI / UX (mobile-first, 375px)

### Navegação (decisão aprovada — recomendação do pixel)

- **bottom-nav:** o item **"Regras"** é trocado por **"Copa"** (ícone `Globe`, href `/calendario`).
  Resultado: `Início · Palpites · Ranking · Copa · Premiação` (+ Admin p/ admin).
- **`/calendario`** ganha abas **`[ Agenda | Grupos ]`** (estado de client, sem inflar a nav).
- **Regras** passa a ser uma **aba dentro de `/premiacao`** (`[ Premiação | Regras ]`) — conteúdo
  conceitualmente próximo (prêmios/pontuação). `/regras` continua existindo e redireciona/serve a
  mesma página por compatibilidade de links.

### Tela de Grupos

- **Seletor de grupo** A–L: pills com scroll horizontal (mesmo padrão de `FiltroFase`).
- **Tabela** (colunas em 375px): borda-esquerda de zona · `#` · bandeira+nome · `J` · `P` · `SG`.
  Em `sm:` adiciona `V E D`; em `md:` adiciona `GP GC`.
- **Zonas** (Copa 2026 — top-2 avançam; 8 melhores 3ºs também):
  - 1º–2º: borda/realce **verde** (`brand-500`) + legenda "Avança".
  - 3º: realce **âmbar** + legenda "Repescagem (prov.)" — só 8 de 12 passam, não pode ser verde.
  - 4º: sem realce, `opacity-60` + "Eliminado".
  - Legenda compacta uma vez por grupo.
- **Histórico do grupo** abaixo da tabela: encerrados com placar (mais recentes primeiro), depois
  agendados com data.
- **Estados:** loading (skeleton de 4 linhas + 3 cards), erro (mensagem + "Tentar novamente"
  via `refetch()`), grupo sem jogos (tabela zerada com `—`, nunca omitida).

### Polish de alto impacto (sem dependência nova)

1. Borda-esquerda colorida de zona (`border-l-[3px]`) — vira "tabela de liga" de verdade.
2. Transição `fade-slide-in` ao trocar de grupo (`key={grupoAtivo}` + keyframes no CSS global).
3. Status confirmado quando `finalizado` (responde "passou?") — ver Refinamento abaixo; a primeira
   versão usava badge de texto inline, substituído por borda reforçada + ponto + legenda adaptativa.

## Refinamento — status confirmado fora do fluxo do nome (2026-06-12)

**Problema observado em produção:** o badge de texto inline ("Classificado"/"Repescagem")
renderizado ao lado do nome quebrava o layout com nomes longos ("República Tcheca", "Bósnia e
Herzegovina") — empurrava as colunas numéricas (`SG`/`P`) para fora em 375px. Com nomes curtos
cabia; layout instável conforme o nome.

**Causa raiz:** em `<table>` com `table-layout: auto`, o `<th>` do nome não tinha largura
constrangida, então o browser o inflava para caber nome + badge e o `truncate` interno nunca
disparava.

**Decisão (consenso pixel + front):** tirar a informação textual do fluxo do nome e movê-la para a
legenda; manter na linha apenas sinais de largura fixa que não competem com o nome.

1. **Truncamento estável:** `<th scope="row">` recebe `w-full max-w-0`; o nome usa
   `min-w-0 flex-1 truncate`. Combinação canônica para truncar em célula de tabela sem
   `table-layout: fixed`. As colunas numéricas seguem `shrink-to-fit`.
2. **Status na linha = borda + ponto de largura fixa:** a borda-esquerda de zona é o sinal
   primário; ao `finalizado` ela engrossa (`border-l-[3px]→border-l-4`) e satura
   (`brand-300→brand-500`, `amber-300→amber-400`), sinalizando "confirmado". Um ponto `h-2 w-2
shrink-0` (verde/âmbar) aparece à direita do nome só quando confirmado, com rótulo `sr-only`
   ("Classificado"/"Repescagem") para acessibilidade (cor sozinha não basta — WCAG 1.4.1). Largura
   da borda é uniforme por tabela (todas as linhas compartilham `finalizado`), sem desalinhamento.
3. **Legenda adaptativa** (`LegendaGrupo`, componente próprio e testado): provisório →
   "Avança / Repescagem (prov.) / Eliminado"; `finalizado` → "Classificado / Repescagem /
   Eliminado". Fonte de verdade: `ClassificacaoGrupo.finalizado`.

Resultado: a tabela fica estável independentemente do tamanho do nome; o badge inline foi removido.

## Integração sem regressão

- `app/calendario/page.tsx` continua **Server Component** (mantém `metadata`). O estado de aba vive
  num widget client novo `src/widgets/calendario-abas/` que renderiza `CalendarioContent` (intacto)
  ou `GruposContent`. **Zero alteração** em `CalendarioContent`.
- `GruposContent` chama `usePartidas()`; mesma `queryKey ["partidas"]` → serve da cache, sem 2º request.
- **Static export** (`output: "export"`) compatível: tudo client-side, sem SSR dinâmico nem `searchParams`.
- **FSD:** a slice de grupos não importa de `features/calendario` (proibido lateral); o histórico do
  grupo tem apresentação própria read-only.

## Testes

- `derivar-classificacao.test.ts` (vitest, função pura): pontos 3/1/0, saldo, ordenação e
  desempate, time sem jogos, jogo `ao-vivo` ignorado, `encerrada` sem placar (guarda), `finalizado`.
- `pnpm type-check` limpo; build de static export sem erro.

## Riscos

| Risco                                          | Mitigação                                                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------ |
| Placar parcial de `ao-vivo` poluir a tabela    | Só conta `encerrada` com placar não-nulo.                                      |
| Formato do campo `grupo` diferente de "A".."L" | Confirmar `select distinct grupo …`; `localeCompare` ordena de qualquer forma. |
| Mover "Regras" quebrar link existente          | `/regras` mantida (serve/redireciona p/ a aba em premiação).                   |
| Mexer no `/calendario` quebrar a agenda        | `CalendarioContent` não é tocado; só o wrapper muda.                           |
