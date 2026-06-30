import { test, expect, type Page } from "@playwright/test";

const ROTAS_PUBLICAS = ["/", "/calendario", "/ranking", "/regras", "/palpites"];

// Ruídos conhecidos que não indicam bug do app (extensões, favicon, etc.).
const RUIDO_CONSOLE = [/favicon/i, /Download the React DevTools/i, /\[Fast Refresh\]/i];

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !RUIDO_CONSOLE.some((re) => re.test(msg.text()))) {
      erros.push(msg.text());
    }
  });
  page.on("pageerror", (err) => erros.push(err.message));
  return erros;
}

test.describe("Smoke — telas públicas", () => {
  test("home carrega com a marca e a navegação", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Resenha - Bolão da Copa")).toBeVisible();
    await expect(page.getByRole("link", { name: "Início" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Palpites" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ranking" })).toBeVisible();
  });

  test("o sino de notificações foi removido", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Notificações" })).toHaveCount(0);
  });

  for (const rota of ROTAS_PUBLICAS) {
    test(`carrega ${rota} sem erro de JavaScript`, async ({ page }) => {
      const erros = coletarErros(page);
      const resposta = await page.goto(rota);
      expect(resposta?.status(), `status HTTP de ${rota}`).toBeLessThan(400);
      // dá tempo do React Query/Supabase resolverem antes de checar o console
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toBeEmpty();
      expect(erros, `erros de console em ${rota}`).toEqual([]);
    });
  }
});
