# Spec — Padrões de código e comentários

**Data:** 2026-06-12 · **Status:** em execução

Duas frentes transversais: (1) varredura de comentários para deixar só o essencial; (2) auditoria
de best practices Next 16 / React 19 / static export e performance.

## Frente 1 — Política de comentários

**Objetivo:** manter apenas comentários que explicam o **"porquê" não-óbvio**; remover os que
apenas repetem o que o código já diz. Alinhado ao CLAUDE.md ("comente só o porquê não-óbvio").

### Mantém (extremamente necessário)

- **Regras de negócio / "porquê" não-óbvio**: pontuação, idempotência da apuração, janela de
  palpite, fuso `America/Sao_Paulo`, desempates.
- **Segurança / integridade**: RLS, grants, CSP, supply-chain (`--frozen-lockfile`), anti-fraude.
- **Armadilhas e decisões**: por que `output: export`, por que `<img>` em vez de `next/image`,
  por que `devIndicators: false`, gotchas de timezone/teste.
- **Acessibilidade**: justificativa de `aria-*`, `sr-only`, `eslint-disable` com motivo.
- **JSDoc de contrato público** quando agrega (tipos de retorno não óbvios, unidades).

### Remove (ruído)

- Comentário que reescreve a linha seguinte ("// incrementa i", "// retorna x").
- Divisórias decorativas sem informação (`// ===== seção =====` puramente visual).
- JSDoc que só repete o nome da função/prop sem agregar.
- Código morto comentado.
- TODO/observações obsoletas já resolvidas.

### Regras de execução

- **Não muda comportamento** — só remove/edita comentário. `type-check`, testes (552) e build
  seguem verdes ao final.
- Comentários de **teste** que documentam a intenção do caso são mantidos quando esclarecem o
  cenário; removidos quando redundantes com o `it(...)`.

## Frente 2 — Auditoria Next/React/Vercel (resultado)

Auditoria dos arquivos de config e fronteiras. **Conclusão: o projeto já está fortemente alinhado.**

### Já está bom (não mexer)

| Item                                                         | Estado                                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `output: "export"` + `images.unoptimized`                    | Correto para SPA estática (Netlify publica `out/`).                                                                                    |
| SVG via `@svgr/webpack` (webpack **e** turbopack)            | Configurado nos dois caminhos.                                                                                                         |
| `<img>` do flagcdn com `loading="lazy"` + fallback `onError` | Correto p/ static export (evita loader server-side); `next/image` exigiria loader custom sem ganho.                                    |
| Security headers                                             | `public/_headers`: CSP, HSTS, XFO, nosniff, Referrer/Permissions-Policy (A-3 corrigido).                                               |
| Supply-chain                                                 | `--frozen-lockfile` no Netlify (integridade do payload PIX).                                                                           |
| TS `strict: true`                                            | Ligado; sem `any` (regra do projeto).                                                                                                  |
| Fronteira Server/Client                                      | 45/105 `"use client"` — só onde há interação; páginas com `metadata` ficam Server Components (ver `calendario-abas`/`premiacao-abas`). |
| Memoização                                                   | `useMemo` só onde paga (derivações sobre `partidas`); sem over-memo.                                                                   |
| `prefers-reduced-motion`                                     | Respeitado na animação de troca de grupo.                                                                                              |

### Recomendações opcionais (P2 — não aplicar sem decisão)

- **Error boundary de rota** (`app/error.tsx`): resiliência extra; hoje os erros são tratados por
  estado nos _content components_ (React Query `isError` + retry). Ganho marginal.
- **`tsconfig` mais estrito** (`noUncheckedIndexedAccess`, `noUnusedLocals`): aumenta segurança de
  tipos, mas pode exigir ajustes pontuais. Avaliar fora desta frente.

Decisão: **não aplicar P2 agora** — risco/ruído sem ganho claro, mesmo princípio de não mexer no
que já está sólido.

## Validação

`pnpm type-check` · `pnpm lint` · `pnpm test:run` (552) · `pnpm format:check` · build — todos
verdes após a varredura.
