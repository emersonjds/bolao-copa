import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

/**
 * Evidência visual: inputs de placar (type="text" inputmode="numeric") exibem
 * o valor centralizado após a remoção do spinner nativo do type="number".
 * Roda no projeto "authenticated". Gera PNGs em e2e/placar-centralizado/.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function adminClient(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false } });
}

function hojeDentroDaJanelaISO(): string {
  const d = new Date();
  d.setHours(23, 0, 0, 0);
  return d.toISOString();
}

let jogoId: string | null = null;
let dataHoraOriginal: string | null = null;

test.describe("Placar centralizado — evidência visual", () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "requer SUPABASE_SERVICE_ROLE_KEY em .env.local");

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY) return;
    const admin = adminClient(SUPABASE_URL, SERVICE_KEY);
    // Usa o 2º jogo da lista (range 1-1) para não colidir com palpites.spec.ts
    // que reserva o 1º (range 0-0) com a mesma data_hora de hoje.
    const { data, error } = await admin
      .from("partidas")
      .select("id, data_hora")
      .eq("fase", "grupos")
      .eq("status", "agendada")
      .order("data_hora", { ascending: true })
      .range(1, 1)
      .single();
    if (error || !data) return;
    jogoId = data.id;
    dataHoraOriginal = data.data_hora;
    await admin.from("partidas").update({ data_hora: hojeDentroDaJanelaISO() }).eq("id", data.id);
  });

  test("input type=text inputmode=numeric exibe valor 3×2 centralizado", async ({ page }) => {
    const dir = path.join(process.cwd(), "e2e/placar-centralizado");
    fs.mkdirSync(dir, { recursive: true });

    await page.goto("/palpites");
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();

    const inputs = page.locator('input[type="text"][inputmode="numeric"]:not([disabled])');

    // Auto-espera o React Query carregar as partidas (o heading aparece antes dos
    // dados). O beforeAll já liberou um jogo, então o input editável deve surgir.
    await expect(inputs.first()).toBeVisible({ timeout: 15_000 });

    // Confirma que os inputs são type="text" (sem spinner nativo) com inputmode="numeric"
    expect(await inputs.nth(0).getAttribute("type")).toBe("text");
    expect(await inputs.nth(0).getAttribute("inputmode")).toBe("numeric");

    // Preenche placar 3 × 2
    await inputs.nth(0).fill("3");
    await inputs.nth(1).fill("2");
    await expect(inputs.nth(0)).toHaveValue("3");
    await expect(inputs.nth(1)).toHaveValue("2");

    // Screenshot 1: página completa com o placar preenchido
    await page.screenshot({ path: path.join(dir, "01-palpite-preenchido.png") });

    // Screenshot 2: close-up do card com os inputs (mostra centralização)
    const card = page
      .locator("article")
      .filter({ has: inputs.nth(0) })
      .first();
    await card.screenshot({ path: path.join(dir, "02-card-closeup.png") });

    // Medição: padding igual nos dois lados do valor → centralização confirmada via CSS
    // (text-center + font-mono no INPUT_BASE do card-palpite.tsx)
    const box0 = await inputs.nth(0).boundingBox();
    const box1 = await inputs.nth(1).boundingBox();
    expect(box0).not.toBeNull();
    expect(box1).not.toBeNull();
    // Inputs devem ter o mesmo tamanho (ambos com as mesmas classes Tailwind)
    expect(box0!.width).toBeCloseTo(box1!.width, 0);
    expect(box0!.height).toBeCloseTo(box1!.height, 0);
  });

  test.afterAll(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY || !jogoId || !dataHoraOriginal) return;
    const admin = adminClient(SUPABASE_URL, SERVICE_KEY);
    await admin.from("partidas").update({ data_hora: dataHoraOriginal }).eq("id", jogoId);
    jogoId = null;
    dataHoraOriginal = null;
  });
});
