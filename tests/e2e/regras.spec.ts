import { test, expect } from "@playwright/test";

/**
 * Tela de Regras (/regras) — pública. Cobre a tabela transparente "Pontos por
 * fase" (base × peso) e a regra de empate (divide o prêmio; sem ordem
 * alfabética como critério).
 */

test.describe("Regras — pontuação (público)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/regras");
    await expect(page.getByRole("heading", { name: "Regras e pontuação" })).toBeVisible();
  });

  test("mostra a tabela de pontos por fase com os pesos aplicados", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Pontos por fase" })).toBeVisible();
    const tabela = page.getByRole("table");
    await expect(tabela).toBeVisible();
    // Cravar na decisão (×3): 5→15 e 4→12.
    await expect(tabela.getByText("15", { exact: true })).toBeVisible();
    await expect(tabela.getByText("12", { exact: true })).toBeVisible();
  });

  test("empate real divide o prêmio (sem ordem alfabética como critério)", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Desempate no ranking" })).toBeVisible();
    await expect(page.getByText(/dividem o prêmio/i)).toBeVisible();
    await expect(page.getByText(/alfabétic/i)).toHaveCount(0);
  });
});
