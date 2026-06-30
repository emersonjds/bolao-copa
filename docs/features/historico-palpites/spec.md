# Histórico de palpites (só o meu) — Design

**Data:** 2026-06-06
**Status:** Aprovado

## Problema

Depois que um jogo trava (apito inicial), o participante quer rever o que palpitou
e quantos pontos fez, para conferir o placar de pontos e **não gerar discussão**
sobre "fez ou não fez" o palpite. Hoje os jogos encerrados aparecem misturados aos
abertos na tela "Palpites", sem um total e sem deixar explícito quando não houve palpite.

## Escopo

- **Só o histórico do próprio usuário** (decisão do dono). Ver palpite de terceiros
  fica fora deste spec (a RLS anti-cola já permitiria, mas não é o foco agora).

## Abordagem

Tudo derivado no cliente a partir dos dados já carregados (`usePartidas` +
`useMeusPalpites`). `pontos` vem junto do palpite; o resultado oficial vem da partida.
**Sem migration, sem query nova, sem redeploy de banco.**

Alternativa descartada: RPC `get_meu_historico` no banco — YAGNI; os dados e a RLS
já chegam ao cliente.

## UX

Seletor de vista no topo da tela Palpites: **Palpitar | Histórico**.

- **Palpitar:** só jogos abertos (editáveis). Os jogos travados saem desta aba
  (menos poluição). Mantém o filtro de fase e o botão "Salvar palpites".
- **Histórico:** jogos travados (apito dado), agrupados por rodada/data (mais
  recente primeiro). Resumo no topo: "X pts em Y jogos apurados". Por jogo:
  - meu palpite (ou **"Sem palpite"** explícito),
  - resultado oficial (ou **"A apurar"** se ainda não saiu),
  - badge de pontos (quando apurado).

"Travado" reusa a regra existente: `status ≠ 'agendada'` **ou** `dataHora ≤ agora`.

## Componentes

- `lib/derivar-historico.ts` — função pura
  `derivarHistorico(partidas, palpites, agora?) → { itens, totalPontos, jogosApurados }`,
  com `itens` ordenados por `dataHora` desc. **Com teste unitário.**
- `components/card-historico.tsx` — card read-only de um item (bandeiras, meu
  palpite/sem palpite, resultado/a apurar, pontos).
- `components/historico-content.tsx` — resumo + lista agrupada por data.
- `components/palpites-content.tsx` — ganha estado de vista, o seletor, filtra a
  aba Palpitar para jogos abertos e só mostra "Salvar" na vista Palpitar.

## Erro/vazio

- Histórico vazio: "Nenhum jogo encerrado ainda."
- Loading/erro reusam o que o `PalpitesContent` já trata.

## Testes

- Unit: `derivarHistorico` (split aberto/travado, total, sem-palpite, a-apurar, ordem).
