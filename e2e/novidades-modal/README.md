# E2E — Modal de novidades

Validação de tela (Playwright) do **modal de novidades one-time**, com evidências.

- **Spec da feature:** [`docs/features/novidades-modal/spec.md`](../../docs/features/novidades-modal/spec.md)
- **Teste E2E:** [`tests/e2e/novidades.spec.ts`](../../tests/e2e/novidades.spec.ts) (projeto `novidades`)
- **Como rodar:** `pnpm exec playwright test --project=novidades`
  (requer Supabase local de pé; roda em contexto anônimo limpo, sem a semente dos specs públicos).

## O que o teste valida

1. No **1º acesso** (anônimo), o modal "Novidades no bolão" aparece com as duas novidades
   (Palpite antecipado + Grupos da Copa).
2. Ao clicar **"Bora!"**, o modal fecha.
3. Após **reload**, o modal **não reaparece** (marcado como visto no localStorage).

> Logado, a fonte de verdade é o banco (`avisos_vistos`); anônimo usa localStorage. Os specs E2E
> existentes não quebram porque a semente (`tests/e2e/seed-public.json`) e o `scenario:seed` marcam
> o aviso como visto para os usuários de teste.

## Evidências (Playwright)

| #   | Print                                                                    | O que mostra                               |
| --- | ------------------------------------------------------------------------ | ------------------------------------------ |
| 1   | [`evidencias/01-modal-novidades.png`](evidencias/01-modal-novidades.png) | Modal de novidades no 1º acesso (anônimo). |
| 2   | [`evidencias/02-fechado.png`](evidencias/02-fechado.png)                 | Home após fechar — sem o modal.            |

> Coletadas em 2026-06-12 contra o Supabase local.
