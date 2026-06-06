import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

/**
 * E2E autenticado: salvar E editar palpite contra o Supabase real. Exercita o
 * caminho que dava `42501 permission denied` antes das migrations 0011/0012 —
 * em especial a EDIÇÃO (upsert ON CONFLICT DO UPDATE). Roda só no projeto
 * "authenticated" (storageState de tests/e2e/.auth/user.json).
 *
 * Pré-requisito: SUPABASE_SERVICE_ROLE_KEY em .env.local. Sem ela, auto-pula.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const META_FILE = path.join(process.cwd(), "tests/e2e/.auth/user.meta.json");

test.describe("Palpites (autenticado)", () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "requer SUPABASE_SERVICE_ROLE_KEY em .env.local");

  test("salva e edita um palpite sem 'permission denied'", async ({ page }) => {
    await page.goto("/palpites");

    // Logado: renderiza o conteúdo, não o CTA de login.
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();
    await expect(page.getByText("Entrar com Google")).toHaveCount(0);

    // Primeiro par de inputs editáveis (jogo aberto na aba Palpitar).
    const inputsEditaveis = page.locator('input[type="number"]:not([disabled])');
    await expect(inputsEditaveis.first()).toBeVisible();

    // 1ª gravação — caminho INSERT.
    await inputsEditaveis.nth(0).fill("3");
    await inputsEditaveis.nth(1).fill("1");
    const salvar = page.getByRole("button", { name: "Salvar palpites" });
    await salvar.click();
    await expect(page.getByText("Palpites salvos!")).toBeVisible();

    // 2ª gravação editando o mesmo jogo — caminho ON CONFLICT DO UPDATE (o que
    // dava 42501). Precisa passar agora.
    await inputsEditaveis.nth(0).fill("4");
    await expect(salvar).toBeVisible();
    await salvar.click();
    await expect(page.getByText("Palpites salvos!")).toBeVisible();

    // Em nenhum momento pode aparecer erro de permissão.
    await expect(page.getByText(/permission denied/i)).toHaveCount(0);
    await expect(page.getByText(/erro ao salvar/i)).toHaveCount(0);
  });

  // Limpeza: deletar o usuário de teste remove participante + palpites em
  // cascata (FKs on delete cascade), sem poluir o bolão real.
  test.afterAll(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY || !fs.existsSync(META_FILE)) return;
    const meta = JSON.parse(fs.readFileSync(META_FILE, "utf-8")) as { userId?: string };
    if (!meta.userId) return;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    await admin.auth.admin.deleteUser(meta.userId);
  });
});
