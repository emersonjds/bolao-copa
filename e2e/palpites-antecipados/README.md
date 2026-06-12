# E2E — Palpites antecipados

Validação de tela (Playwright) da feature **palpites antecipados persistentes**, com evidências.

- **Spec da feature:** [`docs/features/palpites-antecipados/spec.md`](../../docs/features/palpites-antecipados/spec.md)
- **Teste E2E:** [`tests/e2e/palpites.spec.ts`](../../tests/e2e/palpites.spec.ts) → "salva palpite antecipado com modal de confirmação (evidências)"
- **Como rodar:** `pnpm exec playwright test palpites.spec.ts --project=authenticated -g "antecipado"`
  (requer Supabase local de pé + `SUPABASE_SERVICE_ROLE_KEY`; o projeto `setup` cria a sessão).

## O que o teste valida

1. Preenche o placar de um jogo **futuro** (antecipado) na aba Palpitar.
2. Ao salvar pela 1ª vez, o **modal de confirmação** aparece e explica que o palpite vale e é
   ajustável até o apito (nada é gravado antes de confirmar).
3. Ao confirmar, o palpite é **gravado no servidor** (POST 200, antes dava `palpite_nao_liberado`
   400 — corrigido pela migration `0021_palpite_libera_antecipado`).
4. O card passa a exibir o badge **Salvo** e "Palpite salvo · ajuste até o jogo começar".
5. Numa 2ª gravação, o modal **não** reaparece e a edição persiste direto.

## Evidências (Playwright)

| #   | Print                                                                        | O que mostra                                                            |
| --- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | [`evidencias/01-modal-confirmacao.png`](evidencias/01-modal-confirmacao.png) | Modal de 1ª vez ao salvar um palpite antecipado.                        |
| 2   | [`evidencias/02-palpite-salvo.png`](evidencias/02-palpite-salvo.png)         | Jogo de "Amanhã" com badge **Salvo**, placar 2×1 e microcopy de ajuste. |

> Coletadas em 2026-06-12 contra o Supabase local com a migration `0021` aplicada.
