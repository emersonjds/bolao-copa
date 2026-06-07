import { test, expect } from "@playwright/test";

/**
 * Valida o RANKING do cenário (Supabase local + `pnpm scenario:seed`).
 * Público — não precisa login. Pontos determinísticos pelo seed.
 *
 * Layout: "Craque da rodada" + pódio (top 3, primeiro nome) + "Demais
 * participantes" (4º+, nome completo).
 */

test.describe("Ranking — cenário de teste", () => {
  test("craque, pódio e demais participantes aparecem", async ({ page }) => {
    await page.goto("/ranking");
    // Craque da rodada e os de baixo (nome completo na lista "demais").
    await expect(page.getByText("Ana Atacante").first()).toBeVisible();
    await expect(page.getByText("Carla Meio").first()).toBeVisible();
    await expect(page.getByText("Diego Lanterna").first()).toBeVisible();
  });

  test("pontos do cenário (473 líder, 417 vice, 74 lanterna)", async ({ page }) => {
    await page.goto("/ranking");
    for (const pts of ["473 pts", "417 pts", "74 pts"]) {
      await expect(page.getByText(pts).first()).toBeVisible();
    }
  });
});
