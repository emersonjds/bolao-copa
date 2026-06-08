# Documentação — Bolão da Copa 2026

**Comece por aqui:** [`PROJETO.md`](PROJETO.md) — handbook de gestão (arquitetura, regras,
ambientes, testes, segurança, performance, estado atual). É o "leia primeiro" pra agents e devs
trabalharem sem reler o projeto todo. Regras de ouro: [`../CLAUDE.md`](../CLAUDE.md).

## Mapa das docs

### Gestão

| Doc                        | O que é                                                                        |
| -------------------------- | ------------------------------------------------------------------------------ |
| [`PROJETO.md`](PROJETO.md) | Handbook: visão geral, domínio/regras, ambientes, testes, estado e pendências. |

### Auditorias

| Doc                                                          | O que é                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [`audits/security-review.md`](audits/security-review.md)     | Achados de segurança + status (C-1 crítico corrigido, etc.). |
| [`audits/performance-audit.md`](audits/performance-audit.md) | Métricas de performance e fixes priorizados.                 |

### Especificações (SDD / design docs)

| Doc                                                                                                                                              | O que é                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [`superpowers/specs/2026-06-05-mvp-bolao-funcional-design.md`](superpowers/specs/2026-06-05-mvp-bolao-funcional-design.md)                       | Design do MVP funcional.                           |
| [`superpowers/specs/2026-06-05-fase2-google-auth-design.md`](superpowers/specs/2026-06-05-fase2-google-auth-design.md)                           | Auth com Google.                                   |
| [`superpowers/specs/2026-06-06-historico-palpites-design.md`](superpowers/specs/2026-06-06-historico-palpites-design.md)                         | Histórico de palpites.                             |
| [`superpowers/specs/2026-06-06-validacao-cenarios-todas-fases-design.md`](superpowers/specs/2026-06-06-validacao-cenarios-todas-fases-design.md) | Validação por fase + cenário de teste (3 camadas). |

### Planos de implementação

| Doc                                                                                                            | O que é                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------ |
| [`superpowers/plans/2026-06-05-01-banco-e-seed.md`](superpowers/plans/2026-06-05-01-banco-e-seed.md)           | Banco e seed.            |
| [`superpowers/plans/2026-06-05-02-fase2-google-auth.md`](superpowers/plans/2026-06-05-02-fase2-google-auth.md) | Fase 2 — Google Auth.    |
| [`superpowers/plans/2026-06-07-performance.md`](superpowers/plans/2026-06-07-performance.md)                   | Performance (executado). |

### Design / UX

| Doc                                                                      | O que é                                       |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| [`design/2026-06-05-ui-core-spec.md`](design/2026-06-05-ui-core-spec.md) | Spec de UI core.                              |
| [`design/home-jogos-por-dia.md`](design/home-jogos-por-dia.md)           | Home agrupando jogos por dia (a implementar). |
| `design/stitch/*.png`                                                    | Mockups de referência.                        |

## Convenção

Novas docs entram numa dessas categorias e são indexadas aqui. SDD → `superpowers/specs/`;
plano → `superpowers/plans/`; auditoria → `audits/`; design → `design/`.
