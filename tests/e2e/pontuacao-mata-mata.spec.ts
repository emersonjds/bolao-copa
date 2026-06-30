import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { loginComo } from "./helpers/login-demo";
import { silenciarAvisos } from "./helpers/silenciar-avisos";

/**
 * Pontuação do mata-mata por "quem avança". Cobre as 3 frentes da feature na
 * tela, com evidências em PNG:
 *   1. Palpitar empate num jogo de mata-mata exige escolher quem passa.
 *   2. Página de regras explica a regra nova.
 *   3. Modal de aviso anuncia a mudança e some ao confirmar.
 *
 * Requer Supabase local + `pnpm scenario:seed` (deixa a final aberta com times
 * já definidos pelo cascade da semi).
 */

const DIR = path.join(process.cwd(), "e2e/pontuacao-mata-mata/evidencias");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Amanhã às 22h locais — sempre futuro, faz o card virar "antecipado". */
function amanhaISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(22, 0, 0, 0);
  return d.toISOString();
}

// ── Palpite de mata-mata empatado (autenticado via conta demo do cenário) ──────
test.describe("Palpite empate no mata-mata exige quem passa", () => {
  // Serial: o beforeAll move um jogo compartilhado (a final) e o afterAll restaura.
  test.describe.configure({ mode: "serial" });
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "requer SUPABASE_SERVICE_ROLE_KEY em .env.local");

  let final: { id: string; dataHoraOriginal: string } | null = null;

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY) return;
    const admin = adminClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin
      .from("partidas")
      .select("id, data_hora")
      .eq("fase", "final")
      .eq("status", "agendada")
      .limit(1)
      .single();
    if (error || !data) {
      throw new Error(`Setup: nenhuma final agendada (${error?.message ?? "vazio"}). Rode scenario:seed.`);
    }
    final = { id: data.id, dataHoraOriginal: data.data_hora };
    // Move para amanhã: vira "antecipado" e entra no recorte hoje+próximo-dia.
    const { error: e } = await admin
      .from("partidas")
      .update({ data_hora: amanhaISO() })
      .eq("id", data.id);
    if (e) throw new Error(`Setup: falha ao mover a final (${e.message})`);
  });

  test("mostra o seletor, bloqueia o save sem escolha e salva ao escolher", async ({
    page,
    context,
  }) => {
    fs.mkdirSync(DIR, { recursive: true });
    await loginComo(context, "demo@bolao.test");

    await page.goto("/palpites");
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();

    await page.getByRole("tab", { name: "Final" }).click();

    const card = page.locator("article", { hasText: "Amanhã" }).first();
    await expect(card).toBeVisible();
    const inputs = card.locator('input[type="text"][inputmode="numeric"]:not([disabled])');
    await inputs.nth(0).fill("1");
    await inputs.nth(1).fill("1");

    // Empate em jogo de mata-mata → seletor "Quem passa?" aparece.
    const seletor = card.getByLabel("Quem passa?");
    await expect(seletor).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "01-seletor-quem-passa.png") });

    // Salvar sem escolher quem passa: bloqueado com aviso.
    await page.getByRole("button", { name: "Salvar palpites" }).click();
    await expect(
      page.getByText("Escolha quem passa nos jogos de mata-mata empatados")
    ).toBeVisible();
    await expect(page.getByText("Palpites salvos!")).toHaveCount(0);
    await page.screenshot({ path: path.join(DIR, "02-bloqueado-sem-escolha.png") });

    // Escolhe quem passa e salva (jogo antecipado → confirma no modal de 1ª vez).
    await seletor.selectOption({ index: 1 });
    await page.getByRole("button", { name: "Salvar palpites" }).click();
    const modalAntecipado = page.getByRole("dialog");
    await expect(modalAntecipado).toBeVisible();
    await modalAntecipado.getByRole("button", { name: "Entendi, salvar" }).click();

    await expect(page.getByText("Palpites salvos!")).toBeVisible();
    await expect(card.getByText(/^Salvo$/)).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "03-salvo-com-quem-passa.png") });

    await expect(page.getByText(/permission denied/i)).toHaveCount(0);
  });

  test.afterAll(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY || !final) return;
    const admin = adminClient(SUPABASE_URL, SERVICE_KEY);
    // Remove o palpite criado na final e restaura a data original.
    await admin.from("palpites").delete().eq("partida_id", final.id);
    await admin
      .from("partidas")
      .update({ data_hora: final.dataHoraOriginal })
      .eq("id", final.id);
    final = null;
  });
});

// ── Página de regras (público) ────────────────────────────────────────────────
test.describe("Regras — seção do mata-mata (público)", () => {
  test("mostra 'Como funciona no mata-mata' com a regra de quem passa", async ({ page }) => {
    fs.mkdirSync(DIR, { recursive: true });
    await silenciarAvisos(page);
    await page.goto("/regras");

    const secao = page.getByRole("region", { name: /como funciona no mata-mata/i });
    await expect(secao).toBeVisible();
    await expect(secao.getByText("Cravou a vitória e acertou quem passa")).toBeVisible();
    await expect(secao.getByText("Errou quem passa")).toBeVisible();
    await secao.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(DIR, "04-regras-mata-mata.png") });
  });
});

// ── Modal de aviso (anônimo, contexto limpo) ──────────────────────────────────
test.describe("Modal 'Mudou a pontuação do mata-mata' (anon)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("aparece no 1º acesso e some ao clicar Bora!", async ({ page }) => {
    fs.mkdirSync(DIR, { recursive: true });

    // Marca todos os avisos como vistos MENOS o de pontuação, para isolá-lo.
    await page.addInitScript(() => {
      const antecedentes = [
        "novidades-2026-06",
        "mata-mata-2026-06",
        "oitavas-2026",
        "quartas-2026",
        "semifinal-2026",
        "final-2026",
        "chaveamento-2026",
      ];
      for (const id of antecedentes) localStorage.setItem(`aviso-visto:${id}`, "1");
    });

    await page.goto("/");
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Mudou a pontuação do mata-mata")).toBeVisible();
    await expect(modal.getByText("Agora vale quem passa")).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "05-modal-pontuacao.png") });

    await modal.getByRole("button", { name: "Bora!" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({ path: path.join(DIR, "06-modal-fechado.png") });

    await page.reload();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
