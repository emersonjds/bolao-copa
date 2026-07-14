import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { silenciarAvisos } from "./helpers/silenciar-avisos";

/**
 * Conteúdo e interação da Agenda (/calendario). Os jogos vêm do Supabase real
 * (seed do torneio completo). A agenda abre JÁ FILTRADA no dia de hoje; para
 * ver a lista completa é preciso desmarcar o dia atual (clique no chip com
 * aria-current="date" faz toggle do filtro). Tela pública, não depende de sessão.
 */

const TIMES_NA_AGENDA = ["México", "Brasil", "Argentina", "França", "Espanha", "Inglaterra"];

const DIR = path.join(process.cwd(), "e2e/agenda-sem-jogos/evidencias");

function seletorSemana(page: Page) {
  return page.getByRole("group", { name: "Selecionar dia" });
}

// getByRole não expõe filtro por aria-current nesta versão do Playwright;
// aria-current="date" é o atributo ARIA que marca o chip do dia de hoje.
function chipDeHoje(page: Page) {
  return seletorSemana(page).locator('button[aria-current="date"]');
}

test.describe("Calendário — agenda da Copa (público)", () => {
  test.beforeEach(async ({ page }) => {
    await silenciarAvisos(page);
  });

  test("exibe título e subtítulo da Copa", async ({ page }) => {
    await page.goto("/calendario");
    await expect(page.getByRole("heading", { name: "Copa 2026", level: 1 })).toBeVisible();
    await expect(page.getByText("Agenda e grupos · Jun–Jul 2026")).toBeVisible();
  });

  test("a aba Grupos mostra a classificação por grupo", async ({ page }) => {
    await page.goto("/calendario");
    await page.getByRole("tab", { name: "Grupos" }).click();
    await expect(page.getByRole("tab", { name: "Grupo A" })).toBeVisible();
    // Cabeçalho da tabela de classificação (coluna Pontos).
    await expect(page.getByRole("columnheader", { name: "P", exact: true }).first()).toBeVisible();
  });

  test("lista as seleções da agenda (dados do Supabase)", async ({ page }) => {
    await page.goto("/calendario");
    // A agenda abre filtrada em hoje; desmarcar o dia atual volta a listar tudo.
    await chipDeHoje(page).click();
    for (const time of TIMES_NA_AGENDA) {
      await expect(
        page.getByText(time, { exact: true }).first(),
        `seleção ${time} deveria aparecer na agenda`
      ).toBeVisible();
    }
  });

  test("o seletor de semana oferece navegação anterior/próxima e 7 dias", async ({ page }) => {
    await page.goto("/calendario");
    await expect(page.getByRole("button", { name: "Semana anterior" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Próxima semana" })).toBeVisible();
    await expect(seletorSemana(page).getByRole("button")).toHaveCount(7);
  });

  test("selecionar um dia sem jogos filtra a agenda para o estado vazio", async ({ page }) => {
    await page.goto("/calendario");
    // Garante que a agenda carregou (seletor de dias real, não o skeleton) antes de navegar.
    await expect(seletorSemana(page)).toBeVisible();

    // Navega para uma semana pós-Copa (após 19/jul/2026 — sem jogos). Cada clique
    // em "Próxima semana" já limpa o filtro de dia (volta a exibir tudo).
    // "Semana anterior" ficou inválida: dentro da Copa, semanas passadas também têm jogos.
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Próxima semana" }).click();
    }
    // Seleciona o primeiro dia dessa semana → filtro por dia vazio.
    await seletorSemana(page).getByRole("button").first().click();

    await expect(page.getByText("Nenhum jogo neste dia")).toBeVisible();
  });

  test("desmarcar o dia volta a exibir todos os jogos", async ({ page }) => {
    await page.goto("/calendario");
    // Navega para uma semana pós-Copa (após 19/jul/2026 — sem jogos).
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Próxima semana" }).click();
    }

    const primeiroDia = seletorSemana(page).getByRole("button").first();
    await primeiroDia.click();
    await expect(page.getByText("Nenhum jogo neste dia")).toBeVisible();

    // Clicar de novo no mesmo dia (toggle) remove o filtro.
    await primeiroDia.click();
    await expect(page.getByText("Nenhum jogo neste dia")).toHaveCount(0);
    await expect(page.getByText("Brasil", { exact: true }).first()).toBeVisible();
  });
});

/**
 * Estado vazio "Sem jogos hoje" + CTA "Ver esse dia": exige "hoje" caindo num
 * dia sem partida no seed. O seed do torneio deixa 12–13/jul/2026 sem jogos
 * (janela entre quartas e semifinal) — fixamos o relógio ali com page.clock
 * em vez de depender da data real do sistema, que muda a cada dia.
 */
test.describe("Agenda — estado vazio de hoje e atalho para o próximo dia", () => {
  test.use({ timezoneId: "America/Sao_Paulo" });

  test.beforeEach(async ({ page }) => {
    await silenciarAvisos(page);
    await page.clock.setFixedTime(new Date("2026-07-13T15:00:00-03:00"));
  });

  test("hoje sem jogos exibe 'Sem jogos hoje' e o CTA 'Ver esse dia'", async ({ page }) => {
    fs.mkdirSync(DIR, { recursive: true });
    await page.goto("/calendario");

    await expect(page.getByText("Sem jogos hoje")).toBeVisible();
    await expect(page.getByText("Bola rola amanhã · terça-feira, 14 de julho")).toBeVisible();
    await expect(page.getByText("Bósnia e Herzegovina × França")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ver esse dia" })).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "01-sem-jogos-hoje.png") });

    // O próximo dia com jogo (amanhã) ganha destaque no seletor de semana.
    const chipAmanha = seletorSemana(page).getByRole("button", {
      name: "terça-feira, 14 de julho — próximo dia com jogos",
    });
    await expect(chipAmanha).toBeVisible();
    await expect(chipAmanha.locator("span").nth(1)).toHaveClass(/ring-brand-300/);
    await page.screenshot({ path: path.join(DIR, "03-seletor-destaque.png") });
  });

  test("clicar em 'Ver esse dia' pula para o próximo dia com jogos e lista as partidas", async ({
    page,
  }) => {
    fs.mkdirSync(DIR, { recursive: true });
    await page.goto("/calendario");

    await page.getByRole("button", { name: "Ver esse dia" }).click();

    await expect(page.getByText("Sem jogos hoje")).toHaveCount(0);
    await expect(page.getByText("Bósnia e Herzegovina", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("França", { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: path.join(DIR, "02-proximo-dia.png") });
  });
});
