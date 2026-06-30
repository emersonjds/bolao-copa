import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Tela de chaveamento (/chaveamento): bracket do mata-mata, controles de zoom,
 * acesso via aba Copa e modal "Veja o chaveamento!".
 * Requer Supabase local + `pnpm scenario:seed`.
 * Gera evidências em e2e/chaveamento/evidencias/.
 */

const DIR = path.join(process.cwd(), "e2e/chaveamento/evidencias");

// Todos os IDs de aviso conhecidos — usados para silenciar modais nos testes de bracket.
const TODOS_AVISOS = [
  "novidades-2026-06",
  "mata-mata-2026-06",
  "oitavas-2026",
  "quartas-2026",
  "semifinal-2026",
  "final-2026",
  "chaveamento-2026",
];

test.describe("Chaveamento — bracket e controles (público)", () => {
  test.beforeEach(async ({ page }) => {
    // Silencia todos os avisos via localStorage para que modais não interfiram
    // nos testes de conteúdo. Os modais são validados no describe abaixo.
    await page.addInitScript((ids: string[]) => {
      for (const id of ids) localStorage.setItem(`aviso-visto:${id}`, "1");
    }, TODOS_AVISOS);
  });

  test("rodadas renderizam com múltiplas fases e seleções reais", async ({
    page,
  }) => {
    fs.mkdirSync(DIR, { recursive: true });
    await page.goto("/chaveamento");
    await expect(page.getByRole("heading", { name: "Chaveamento" })).toBeVisible();
    // Ao menos dois títulos de fase confirmam que o bracket carregou e é multi-coluna
    await expect(page.getByText("32-avos").first()).toBeVisible();
    await expect(page.getByText("Oitavas").first()).toBeVisible();
    // Pelo menos uma seleção real visível (dados chegaram do Supabase)
    await expect(page.getByText("Brasil").first()).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "01-bracket.png") });
  });

  test("controles de zoom (−/+) presentes e operáveis", async ({ page }) => {
    fs.mkdirSync(DIR, { recursive: true });
    await page.goto("/chaveamento");
    await expect(page.getByRole("heading", { name: "Chaveamento" })).toBeVisible();

    const btnMenos = page.getByRole("button", { name: "Diminuir zoom" });
    const btnMais = page.getByRole("button", { name: "Aumentar zoom" });
    await expect(btnMenos).toBeVisible();
    await expect(btnMais).toBeVisible();

    // Aumentar zoom de 100% → 125%
    await btnMais.click();
    await expect(page.getByText("125%")).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "02-zoom.png") });
  });

  test("aba Chaveamento na tela Copa renderiza o bracket inline", async ({ page }) => {
    fs.mkdirSync(DIR, { recursive: true });
    await page.goto("/calendario");
    await page.getByRole("tab", { name: "Chaveamento" }).click();
    await expect(page.getByText("32-avos").first()).toBeVisible();
    await expect(page.getByText("Oitavas").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Aumentar zoom" })).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "03-acesso-copa.png") });
  });
});

test.describe("Modal 'Veja o chaveamento!' (anon)", () => {
  // Contexto limpo: sem storageState do projeto, para controlar exatamente
  // quais avisos estão vistos via addInitScript.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("aparece no 1º acesso, fecha no Bora!, não reaparece após reload", async ({ page }) => {
    fs.mkdirSync(DIR, { recursive: true });

    // Marca todos os avisos anteriores ao chaveamento-2026 como vistos.
    // final-2026 precisa ser marcado caso a fase final já esteja definida;
    // se não estiver (gatilho falso), a gate o pula naturalmente, mas seeding
    // garante que nenhum outro modal apareça antes do chaveamento.
    await page.addInitScript(() => {
      const antecedentes = [
        "novidades-2026-06",
        "mata-mata-2026-06",
        "oitavas-2026",
        "quartas-2026",
        "semifinal-2026",
        "final-2026",
      ];
      for (const id of antecedentes) localStorage.setItem(`aviso-visto:${id}`, "1");
    });

    await page.goto("/");
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Veja o chaveamento!")).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "04-modal.png") });

    await modal.getByRole("button", { name: "Bora!" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: path.join(DIR, "05-modal-fechado.png") });

    // Reload: chaveamento-2026 agora em localStorage → não reaparece.
    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
