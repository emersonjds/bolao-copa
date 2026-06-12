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

/** Cliente admin (service_role) — só no setup de teste, nunca no app. */
function adminClient(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false } });
}

// Mecânica dia a dia (migration 0019): só dá pra SALVAR jogos "liberados" — cuja
// janela [meia-noite BRT do dia do jogo, apito) já abriu. Com as fixtures reais
// da Copa (jun/26) nenhum jogo fica liberado "hoje", então o setup empurra UM
// jogo de grupos para hoje (e restaura no afterAll), tornando-o o único salvável.
let jogoLiberado: { id: string; dataHoraOriginal: string } | null = null;

/** Hoje às 22h locais (ISO): já passou da meia-noite e ainda falta para o apito. */
function hojeDentroDaJanelaISO(): string {
  const d = new Date();
  d.setHours(22, 0, 0, 0);
  return d.toISOString();
}

test.describe("Palpites (autenticado)", () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "requer SUPABASE_SERVICE_ROLE_KEY em .env.local");

  // Garante um jogo salvável HOJE (ver nota acima). Sem service_role o describe
  // inteiro se pula, então este hook só roda quando há credencial.
  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY) return;
    const admin = adminClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin
      .from("partidas")
      .select("id, data_hora")
      .eq("fase", "grupos")
      .eq("status", "agendada")
      .order("data_hora", { ascending: true })
      .limit(1)
      .single();
    if (error || !data) {
      throw new Error(
        `Setup do palpite: nenhum jogo de grupos agendado (${error?.message ?? "vazio"})`
      );
    }
    jogoLiberado = { id: data.id, dataHoraOriginal: data.data_hora };
    const { error: erroUpdate } = await admin
      .from("partidas")
      .update({ data_hora: hojeDentroDaJanelaISO() })
      .eq("id", data.id);
    if (erroUpdate) {
      throw new Error(`Setup do palpite: falha ao liberar o jogo (${erroUpdate.message})`);
    }
  });

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
    // Espera o salvamento assentar: sem pendências o botão some (e o refetch
    // termina). Sem isso, o refetch pode resetar o input antes da 2ª edição.
    await expect(salvar).toBeHidden();

    // 2ª gravação editando o mesmo jogo — caminho ON CONFLICT DO UPDATE (o que
    // dava 42501). Preenche os DOIS campos: um palpite só fica "pendente"
    // quando está completo (regra da UI), então editar um campo só não basta.
    await inputsEditaveis.nth(0).fill("4");
    await inputsEditaveis.nth(1).fill("1");
    await expect(salvar).toBeVisible();
    await salvar.click();
    // Pode haver 2 toasts (o 1º ainda visível) — basta confirmar que apareceu.
    await expect(page.getByText("Palpites salvos!").first()).toBeVisible();

    // Em nenhum momento pode aparecer erro de permissão.
    await expect(page.getByText(/permission denied/i)).toHaveCount(0);
    await expect(page.getByText(/erro ao salvar/i)).toHaveCount(0);
  });

  // Palpite antecipado (jogo futuro): salva no servidor com o modal de 1ª vez.
  // Gera prints de evidência em test-results/evidencias/.
  test("salva palpite antecipado com modal de confirmação (evidências)", async ({ page }) => {
    const dirEvidencias = path.join(process.cwd(), "test-results/evidencias");
    fs.mkdirSync(dirEvidencias, { recursive: true });

    await page.goto("/palpites");
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();

    // Garante que o modal de 1ª vez vai aparecer (limpa só a flag de confirmação,
    // sem tocar na sessão).
    await page.evaluate(() => {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith("palpite-antecipado-confirmado")) localStorage.removeItem(k);
      }
    });
    await page.reload();

    // Card de jogo antecipado (badge "Amanhã") + inputs editáveis.
    const cardFuturo = page.locator("article", { hasText: "Amanhã" }).first();
    await expect(cardFuturo).toBeVisible();
    const inputs = cardFuturo.locator('input[type="number"]:not([disabled])');
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("1");

    await page.getByRole("button", { name: "Salvar palpites" }).click();

    // 1ª vez: o modal explica que o antecipado vale e é ajustável. EVIDÊNCIA.
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/usados quando o jogo começar/i)).toBeVisible();
    await page.screenshot({ path: path.join(dirEvidencias, "antecipado-1-modal.png") });

    await modal.getByRole("button", { name: "Entendi, salvar" }).click();

    // Persistiu: toast de sucesso e o card antecipado passa a exibir "Salvo".
    await expect(page.getByText("Palpites salvos!")).toBeVisible();
    await expect(cardFuturo.getByText(/^Salvo$/)).toBeVisible();
    await page.screenshot({ path: path.join(dirEvidencias, "antecipado-2-salvo.png") });

    await expect(page.getByText(/permission denied/i)).toHaveCount(0);

    // 2ª vez não mostra o modal de novo: edita o placar e salva direto.
    await inputs.nth(0).fill("3");
    await inputs.nth(1).fill("0");
    await page.getByRole("button", { name: "Salvar palpites" }).click();
    await expect(page.getByText("Palpites salvos!").first()).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  // Limpeza: deletar o usuário de teste remove participante + palpites em
  // cascata (FKs on delete cascade), sem poluir o bolão real.
  test.afterAll(async () => {
    if (!SUPABASE_URL || !SERVICE_KEY) return;
    const admin = adminClient(SUPABASE_URL, SERVICE_KEY);

    // Restaura o data_hora original do jogo que empurramos para hoje.
    if (jogoLiberado) {
      await admin
        .from("partidas")
        .update({ data_hora: jogoLiberado.dataHoraOriginal })
        .eq("id", jogoLiberado.id);
      jogoLiberado = null;
    }

    // Remove o usuário de teste (cascata apaga participante + palpites).
    if (!fs.existsSync(META_FILE)) return;
    const meta = JSON.parse(fs.readFileSync(META_FILE, "utf-8")) as { userId?: string };
    if (meta.userId) await admin.auth.admin.deleteUser(meta.userId);
  });
});
