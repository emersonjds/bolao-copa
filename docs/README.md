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

### Features (spec + plano por feature)

Cada feature tem sua pasta em [`features/`](features/) com `spec.md` (design/SDD) e, quando
houve plano de implementação, `plan.md`. Ordenadas da mais recente para a mais antiga.

| Feature                                                         | spec | plan | O que é                                            |
| --------------------------------------------------------------- | :--: | :--: | -------------------------------------------------- |
| [`palpites-antecipados/`](features/palpites-antecipados/)       |  ✓   |  —   | Palpite antecipado persiste no servidor + modal.   |
| [`grupos-da-copa/`](features/grupos-da-copa/)                   |  ✓   |  ✓   | Tabela de classificação por grupo + histórico.     |
| [`lembrete-palpites-email/`](features/lembrete-palpites-email/) |  ✓   |  ✓   | Lembrete diário de palpite por e-mail.             |
| [`backup-diario-json/`](features/backup-diario-json/)           |  ✓   |  ✓   | Backup diário do banco em JSON.                    |
| [`aba-premiacao/`](features/aba-premiacao/)                     |  ✓   |  ✓   | Aba de premiação + inscrição.                      |
| [`palpite-dia-a-dia/`](features/palpite-dia-a-dia/)             |  ✓   |  ✓   | Palpite organizado dia a dia.                      |
| [`validacao-cenarios/`](features/validacao-cenarios/)           |  ✓   |  —   | Validação por fase + cenário de teste (3 camadas). |
| [`historico-palpites/`](features/historico-palpites/)           |  ✓   |  —   | Histórico de palpites.                             |
| [`performance/`](features/performance/)                         |  —   |  ✓   | Otimização de performance (executado).             |
| [`google-auth/`](features/google-auth/)                         |  ✓   |  ✓   | Auth com Google.                                   |
| [`mvp-bolao-funcional/`](features/mvp-bolao-funcional/)         |  ✓   |  —   | Design do MVP funcional.                           |
| [`banco-e-seed/`](features/banco-e-seed/)                       |  —   |  ✓   | Banco e seed inicial.                              |

### Design / UX

| Doc                                                                      | O que é                                       |
| ------------------------------------------------------------------------ | --------------------------------------------- |
| [`design/2026-06-05-ui-core-spec.md`](design/2026-06-05-ui-core-spec.md) | Spec de UI core.                              |
| [`design/home-jogos-por-dia.md`](design/home-jogos-por-dia.md)           | Home agrupando jogos por dia (a implementar). |
| `design/stitch/*.png`                                                    | Mockups de referência.                        |

## Convenção

Cada nova feature ganha uma pasta em `features/<nome-kebab>/` com `spec.md` (design/SDD) e
`plan.md` (plano de implementação), e é indexada na tabela acima. Auditorias → `audits/`;
design/UX e mockups → `design/`.
