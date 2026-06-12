import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Modal de novidades (público, anônimo). Roda no projeto "novidades", sem a
 * semente de localStorage dos specs públicos, então o aviso aparece no 1º acesso.
 * Gera prints de evidência em test-results/evidencias-novidades/.
 */

test.describe("Modal de novidades (público)", () => {
  test("aparece no 1º acesso, fecha e não volta após reload", async ({ page }) => {
    const dir = path.join(process.cwd(), "test-results/evidencias-novidades");
    fs.mkdirSync(dir, { recursive: true });

    await page.goto("/");

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Novidades no bolão")).toBeVisible();
    await expect(modal.getByText("Palpite antecipado")).toBeVisible();
    await expect(modal.getByText("Grupos da Copa")).toBeVisible();
    await page.screenshot({ path: path.join(dir, "01-modal-novidades.png") });

    await modal.getByRole("button", { name: "Bora!" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: path.join(dir, "02-fechado.png") });

    // Reload: já marcado como visto (localStorage), o modal não reaparece.
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
