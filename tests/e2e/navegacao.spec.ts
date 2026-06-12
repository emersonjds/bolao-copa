import { test, expect, type Page } from "@playwright/test";

/**
 * Navegação real pela bottom-nav (sem login). Verifica que clicar em cada aba
 * troca a rota e renderiza a tela correta, e que o item ativo recebe
 * aria-current="page". Seletores por papel/acessibilidade, nunca por CSS.
 */

function navPrincipal(page: Page) {
  return page.getByRole("navigation", { name: "Navegação principal" });
}

test.describe("Navegação — bottom-nav (público)", () => {
  test("as quatro abas públicas estão visíveis na home", async ({ page }) => {
    await page.goto("/");
    const nav = navPrincipal(page);
    await expect(nav.getByRole("link", { name: "Início" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Palpites" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Ranking" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Copa" })).toBeVisible();
  });

  test("a aba Admin não aparece para visitante sem sessão", async ({ page }) => {
    await page.goto("/");
    await expect(navPrincipal(page).getByRole("link", { name: "Admin" })).toHaveCount(0);
  });

  test("clicar em Ranking navega para /ranking", async ({ page }) => {
    await page.goto("/");
    await navPrincipal(page).getByRole("link", { name: "Ranking" }).click();
    await expect(page).toHaveURL(/\/ranking$/);
    await expect(page.getByRole("heading", { name: "Ranking", level: 1 })).toBeVisible();
  });

  test("clicar em Copa navega para /calendario", async ({ page }) => {
    await page.goto("/");
    await navPrincipal(page).getByRole("link", { name: "Copa" }).click();
    await expect(page).toHaveURL(/\/calendario$/);
    await expect(page.getByRole("heading", { name: "Copa 2026", level: 1 })).toBeVisible();
  });

  test("clicar em Palpites navega para /palpites (CTA de login para visitante)", async ({
    page,
  }) => {
    await page.goto("/");
    await navPrincipal(page).getByRole("link", { name: "Palpites" }).click();
    await expect(page).toHaveURL(/\/palpites$/);
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();
  });

  test("clicar em Início volta para a home", async ({ page }) => {
    await page.goto("/regras");
    await navPrincipal(page).getByRole("link", { name: "Início" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Próximos jogos" })).toBeVisible();
  });

  test("a aba atual recebe aria-current=page", async ({ page }) => {
    await page.goto("/ranking");
    const nav = navPrincipal(page);
    await expect(nav.getByRole("link", { name: "Ranking" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    // Uma aba diferente não deve estar marcada como atual.
    await expect(nav.getByRole("link", { name: "Copa" })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

test.describe("Responsividade mobile (375px)", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("home renderiza marca e bottom-nav em 375px", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Resenha - Bolão da Copa")).toBeVisible();
    await expect(navPrincipal(page)).toBeVisible();
    await expect(navPrincipal(page).getByRole("link", { name: "Início" })).toBeVisible();
  });

  test("não há scroll horizontal indevido em 375px na home", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    // tolerância de 1px para arredondamento de sub-pixel
    expect(overflow, "overflow horizontal em px").toBeLessThanOrEqual(1);
  });
});
