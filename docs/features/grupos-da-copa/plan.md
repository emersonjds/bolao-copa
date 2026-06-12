# Plano de implementação — Grupos da Copa

Referência: [`spec.md`](spec.md). Sem commit — entrega pronta para revisão.

## Passo 1 — Núcleo puro + testes

- `src/features/grupos/lib/derivar-classificacao.ts` — `derivarClassificacao(partidas)` conforme
  contrato da spec (`ClassificacaoGrupo[]`, `LinhaClassificacao`).
- `src/features/grupos/lib/derivar-classificacao.test.ts` — casos: 3/1/0, saldo, ordenação +
  desempate, time sem jogos, `ao-vivo` ignorado, `encerrada` sem placar, `finalizado`.

## Passo 2 — UI da slice

- `components/tabela-grupo.tsx` — tabela de 1 grupo (zonas, colunas responsivas, badges).
- `components/historico-jogos-grupo.tsx` — jogos do grupo read-only (placar/horário), reusa
  `FlagIcon`, `nomeSelecaoPt`, `derivarStatusBadge`.
- `components/grupos-content.tsx` — `usePartidas()` + `useMemo`, seletor de grupo A–L, estados
  (loading/erro/vazio), animação `key={grupoAtivo}`.
- `index.ts` — exporta `GruposContent`.

## Passo 3 — Abas no /calendario (sem regressão)

- `src/widgets/calendario-abas/ui/calendario-abas.tsx` (`"use client"`) — estado
  `"agenda" | "grupos"`, pills no padrão `SeletorVista`, renderiza `CalendarioContent` ou
  `GruposContent`. `index.ts`.
- `src/app/calendario/page.tsx` — header "Copa 2026"; troca `<CalendarioContent />` por
  `<CalendarioAbas />`.

## Passo 4 — Nav swap + Regras como aba em Premiação

- `src/features/regras/components/regras-content.tsx` — extrai o corpo de `app/regras/page.tsx`
  para componente reutilizável; `index.ts`.
- `src/app/regras/page.tsx` — passa a renderizar `<RegrasContent />` (rota preservada p/ links).
- `src/widgets/premiacao-abas/ui/premiacao-abas.tsx` (`"use client"`) — abas
  `[ Premiação | Regras ]` renderizando `PremiacaoContent` / `RegrasContent`. `index.ts`.
- `src/app/premiacao/page.tsx` — renderiza `<PremiacaoAbas />`.
- `src/widgets/app-shell/ui/bottom-nav.tsx` — item "Regras" (`BookOpen`, `/regras`) → "Copa"
  (`Globe`, `/calendario`).

## Passo 5 — Polish

- Keyframes `fade-slide-in` no CSS global (reaproveitar se já existir animação equivalente).

## Passo 6 — Validação (sem commit)

- `pnpm vitest run` na slice de grupos (e nada existente quebrado).
- `pnpm type-check` limpo.
- Build static export sem erro.
- Conferência visual mental em 375 / 768 px.
