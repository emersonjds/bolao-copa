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

// Setup move UM jogo de grupos para amanhã 22h (sempre "futuro" — janelaInicio =
// meia-noite BRT de amanhã, ainda não chegou). Ambos os testes usam o mesmo jogo:
//   · teste 1 (salva/edita): pré-confirma o modal para salvamento direto
//   · teste 2 (antecipado): limpa a confirmação → modal aparece na 1ª vez
let jogoFuturo: { id: string; dataHoraOriginal: string } | null = null;

/** Amanhã às 22h locais — sempre no futuro, independente do fuso. */
function amanhaISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(22, 0, 0, 0);
  return d.toISOString();
}

test.describe("Palpites (autenticado)", () => {
  // Serial: beforeAll/afterAll manipulam DB compartilhado (jogo e usuário).
  // Paralelo causaria dois workers executando beforeAll/afterAll simultaneamente,
  // gerando race conditions no setup e dupla deleção do usuário no teardown.
  test.describe.configure({ mode: "serial" });
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "requer SUPABASE_SERVICE_ROLE_KEY em .env.local");

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
    jogoFuturo = { id: data.id, dataHoraOriginal: data.data_hora };

    const { error: e } = await admin
      .from("partidas")
      .update({ data_hora: amanhaISO() })
      .eq("id", data.id);
    if (e) throw new Error(`Setup do palpite: falha ao mover jogo para amanhã (${e.message})`);
  });

  test("salva e edita um palpite sem 'permission denied'", async ({ page }) => {
    // Pré-confirma o modal de palpite antecipado para este teste não precisar
    // interagir com ele — o fluxo do modal é coberto pelo teste seguinte.
    const meta = fs.existsSync(META_FILE)
      ? (JSON.parse(fs.readFileSync(META_FILE, "utf-8")) as { userId?: string })
      : {};
    if (meta.userId) {
      await page.addInitScript((uid: string) => {
        localStorage.setItem(`palpite-antecipado-confirmado:${uid}`, "1");
      }, meta.userId);
    }

    await page.goto("/palpites");

    // Logado: renderiza o conteúdo, não o CTA de login.
    await expect(page.getByRole("heading", { name: "Meus palpites" })).toBeVisible();
    await expect(page.getByText("Entrar com Google")).toHaveCount(0);

    // Primeiro par de inputs editáveis (card do jogo futuro na aba Palpitar).
    const inputsEditaveis = page.locator('input[type="text"][inputmode="numeric"]:not([disabled])');
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
    // Espera a rede assentar para a sessão (cookie) reidratar antes de salvar —
    // sem isso o upsert pode sair com auth.uid() nulo e tomar 42501 (RLS), flaky.
    await page.waitForLoadState("networkidle");

    // Card de jogo antecipado (badge "Amanhã") + inputs editáveis.
    const cardFuturo = page.locator("article", { hasText: "Amanhã" }).first();
    await expect(cardFuturo).toBeVisible();
    const inputs = cardFuturo.locator('input[type="text"][inputmode="numeric"]:not([disabled])');
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("1");

    const btnSalvar = page.getByRole("button", { name: "Salvar palpites" });
    await expect(btnSalvar).toBeVisible({ timeout: 3000 });
    await btnSalvar.click();

    // 1ª vez: o modal explica que o antecipado vale e é ajustável. EVIDÊNCIA.
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/usados quando o jogo começar/i)).toBeVisible();

    // Botões do modal com alvo de toque confortável (h-14 = 56px).
    const caixaConfirmar = await modal
      .getByRole("button", { name: "Entendi, salvar" })
      .boundingBox();
    expect(caixaConfirmar).not.toBeNull();
    expect(caixaConfirmar!.height).toBeGreaterThanOrEqual(52);
    const caixaVoltar = await modal.getByRole("button", { name: "Voltar" }).boundingBox();
    expect(caixaVoltar!.height).toBeGreaterThanOrEqual(52);

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

    // Restaura o data_hora original do jogo que movemos.
    if (jogoFuturo) {
      await admin
        .from("partidas")
        .update({ data_hora: jogoFuturo.dataHoraOriginal })
        .eq("id", jogoFuturo.id);
      jogoFuturo = null;
    }

    // Remove o usuário de teste (cascata apaga participante + palpites).
    if (!fs.existsSync(META_FILE)) return;
    const meta = JSON.parse(fs.readFileSync(META_FILE, "utf-8")) as { userId?: string };
    if (meta.userId) await admin.auth.admin.deleteUser(meta.userId);
  });
});
