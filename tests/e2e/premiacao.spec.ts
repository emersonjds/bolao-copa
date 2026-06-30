import { test, expect } from "@playwright/test";

/**
 * Tela de Premiação (/premiacao) — pública, sem login. Cobre o bloco de
 * pagamento da inscrição (PIX): QR gerado, recebedor, prazo, copia e cola e o
 * aviso de remoção dos não pagantes. O "Pote atual" depende de contagem
 * autenticada, então aqui só validamos o conteúdo estático sempre visível.
 */

test.describe("Premiação — pagamento da inscrição (público)", () => {
  test("a aba Premiação na bottom-nav leva para /premiacao", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Premiação" })
      .click();
    await expect(page).toHaveURL(/\/premiacao$/);
    await expect(page.getByRole("heading", { name: "Premiação", level: 1 })).toBeVisible();
  });

  test("mostra o bloco de pagamento PIX com QR, recebedor e prazo", async ({ page }) => {
    await page.goto("/premiacao");
    await expect(page.getByRole("heading", { name: "Pagamento da inscrição" })).toBeVisible();
    await expect(page.getByRole("img", { name: /QR Code PIX/i })).toBeVisible();
    await expect(page.getByText("JOAO GUSTAVO TOMAZ BARBOSA")).toBeVisible();
    await expect(page.getByText(/10\/06\/2026/).first()).toBeVisible();
    await expect(page.getByLabel("Código PIX copia e cola")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copiar código PIX" })).toBeVisible();
  });

  test("orienta enviar o comprovante e avisa sobre remoção dos não pagantes", async ({ page }) => {
    await page.goto("/premiacao");
    await expect(page.getByText(/comprovante/i).first()).toBeVisible();
    await expect(page.getByText(/11 97180-1555/)).toBeVisible();
    await expect(page.getByText(/removido do bolão/i)).toBeVisible();
  });

  test("mostra a divisão do prêmio 50/30/20", async ({ page }) => {
    await page.goto("/premiacao");
    await expect(page.getByText("50%")).toBeVisible();
    await expect(page.getByText("30%")).toBeVisible();
    await expect(page.getByText("20%")).toBeVisible();
  });
});
