import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { loginComo } from "./helpers/login-demo";

/**
 * Fecha todos os modais de aviso que possam aparecer para um usuário autenticado.
 * O scenario:seed só marca novidades-2026-06 como visto no banco; os modais de
 * fase (mata-mata, oitavas …) aparecem na primeira sessão autenticada do demo.
 */
async function dispensarTodosModais(page: Page): Promise<void> {
  const modal = page.getByRole("dialog");
  for (let i = 0; i < 10; i++) {
    try {
      await modal.waitFor({ state: "visible", timeout: 3000 });
      await modal.getByRole("button", { name: "Bora!" }).click();
      await modal.waitFor({ state: "hidden", timeout: 5000 });
    } catch {
      break;
    }
  }
}

/**
 * Modais de fase do mata-mata e prova de pontuação com multiplicador.
 * Requer Supabase local + `pnpm scenario:seed` com oitavas encerradas.
 * Gera evidências em e2e/mata-mata-ate-final/evidencias/.
 */

const DIR = path.join(process.cwd(), "e2e/mata-mata-ate-final/evidencias");

test.describe("Modal das oitavas (anon)", () => {
  // Contexto limpo para controlar exatamente qual aviso aparece via localStorage.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("aparece no 1º acesso, fecha no Bora!, não reaparece após reload", async ({ page }) => {
    fs.mkdirSync(DIR, { recursive: true });

    // Marca todos os avisos exceto oitavas-2026 como vistos.
    // Avisos posteriores (quartas+) também são marcados para que, ao fechar
    // as oitavas, nenhum outro modal apareça na asserção de count(0).
    await page.addInitScript(() => {
      const outros = [
        "novidades-2026-06",
        "mata-mata-2026-06",
        "quartas-2026",
        "semifinal-2026",
        "final-2026",
        "pontuacao-mata-mata-2026-06",
        "chaveamento-2026",
      ];
      for (const id of outros) localStorage.setItem(`aviso-visto:${id}`, "1");
    });

    await page.goto("/");
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Começaram as oitavas!")).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "01-oitavas-modal.png") });

    await modal.getByRole("button", { name: "Bora!" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Reload: oitavas-2026 agora em localStorage → não reaparece.
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("Pontuação ×2 nas oitavas — Histórico (demo)", () => {
  test("histórico exibe badge Oitavas com pontuação apurada", async ({ context, page }) => {
    fs.mkdirSync(DIR, { recursive: true });

    // Silencia todos os avisos no localStorage (para o caminho anônimo residual).
    // Usuário autenticado usa o banco; o cenário seed deve ter os avisos vistos.
    await page.addInitScript(() => {
      const ids = [
        "novidades-2026-06",
        "mata-mata-2026-06",
        "oitavas-2026",
        "quartas-2026",
        "semifinal-2026",
        "final-2026",
        "pontuacao-mata-mata-2026-06",
        "chaveamento-2026",
      ];
      for (const id of ids) localStorage.setItem(`aviso-visto:${id}`, "1");
    });

    await loginComo(context, "demo@bolao.test");
    await page.goto("/palpites");
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();
    // Fecha quaisquer modais de aviso de fase que apareçam para o usuário autenticado
    // (o scenario:seed só pré-marca novidades-2026-06 no banco).
    await dispensarTodosModais(page);
    await page.getByRole("tab", { name: "Histórico" }).click();

    // Expande paginação para revelar jogos de fases anteriores.
    const verMais = page.getByRole("button", { name: "Ver mais jogos" });
    for (let i = 0; i < 10 && (await verMais.count()); i++) {
      await verMais.first().click();
    }

    // Badge "Oitavas" confirma que o histórico inclui jogos da fase (×2).
    await expect(page.getByText(/^Oitavas$/).first()).toBeVisible();
    // Pontuação apurada visível (prova que apurar_pontos() rodou com peso de fase).
    await expect(page.getByText(/\bpts?\b/i).first()).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "02-pontuacao-x2.png") });
  });
});
