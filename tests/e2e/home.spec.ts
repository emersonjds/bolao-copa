import { test, expect } from "@playwright/test";

/**
 * Estado da home para visitante sem sessão. Cobre o card de login (HeroStats
 * sem sessão), a lista de próximos jogos (MSW) e os atalhos para a agenda.
 * Nota: o card "Próximo jogo em destaque" só aparece quando há jogo nas
 * próximas 24h — fora dessa janela ele não renderiza, então não é asserido.
 */

test.describe("Home — estado público", () => {
  test("mostra o card de login no lugar da posição do bolão", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Faça login para ver sua posição")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar com Google" })).toBeVisible();
  });

  test("lista os próximos jogos vindos do MSW", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Próximos jogos" })).toBeVisible();
    // Pelo menos um confronto da fixture deve aparecer na lista.
    await expect(page.getByText("Brasil", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Argentina", { exact: true }).first()).toBeVisible();
  });

  test("oferece atalho para a agenda completa", async ({ page }) => {
    await page.goto("/");
    const linksAgenda = page.getByRole("link", { name: /Ver agenda completa/ });
    // Há dois atalhos (um sm+ inline, um mobile abaixo da lista); ao menos um existe.
    await expect(linksAgenda.first()).toBeVisible();
  });

  test("o atalho da agenda leva para /calendario", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /Ver agenda completa/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(page.getByRole("heading", { name: "Agenda da Copa" })).toBeVisible();
  });
});
