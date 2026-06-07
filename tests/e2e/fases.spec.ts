import { test, expect } from "@playwright/test";
import { loginComo } from "./helpers/login-demo";

/**
 * Valida TELA A TELA, FASE A FASE: logado como demo (cenário seedado), o
 * Histórico mostra jogos encerrados de TODAS as fases do torneio, cada um com
 * seu badge de fase e placar. Requer Supabase local + `pnpm scenario:seed`.
 *
 * O Histórico é agrupado por dia (sem abas de fase); cada card traz um badge:
 * "Grupo X" para grupos e o rótulo da fase para o mata-mata.
 */

const BADGES_FASE: { fase: string; badge: RegExp }[] = [
  { fase: "Grupos", badge: /Grupo [A-Z]/ },
  { fase: "Trinta e Dois", badge: /^R32$/ },
  { fase: "Oitavas", badge: /^Oitavas$/ },
  { fase: "Quartas", badge: /^Quartas$/ },
  { fase: "Semis", badge: /^Semis$/ },
  { fase: "Terceiro lugar", badge: /^3º Lugar$/ },
  { fase: "Final", badge: /^Final$/ },
];

test.describe("Telas por fase — Histórico (demo)", () => {
  test.beforeEach(async ({ context, page }) => {
    await loginComo(context, "demo@bolao.test");
    await page.goto("/palpites");
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();
    await page.getByRole("tab", { name: "Histórico" }).click();
  });

  for (const { fase, badge } of BADGES_FASE) {
    test(`${fase}: aparece no histórico com placar`, async ({ page }) => {
      await expect(page.getByText(badge).first()).toBeVisible();
    });
  }

  test("os jogos mostram placar (d × d) e pontuação", async ({ page }) => {
    await expect(page.getByText(/\d+\s*×\s*\d+/).first()).toBeVisible();
    await expect(page.getByText(/\bpts?\b/i).first()).toBeVisible();
  });
});
