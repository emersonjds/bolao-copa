import { test, expect, type Page } from "@playwright/test";

/**
 * Conteúdo e interação da Agenda (/calendario). Os jogos vêm do MSW
 * (src/mocks/fixtures/partidas-fixture.ts): 4 partidas da fase de grupos
 * (11–13/jun/2026). Esta tela é pública e não depende de sessão.
 */

const TIMES_NA_AGENDA = ["México", "Brasil", "Argentina", "França", "Espanha", "Inglaterra"];

function seletorSemana(page: Page) {
  return page.getByRole("group", { name: "Selecionar dia" });
}

test.describe("Calendário — agenda da Copa (público)", () => {
  test("exibe título e subtítulo da agenda", async ({ page }) => {
    await page.goto("/calendario");
    await expect(page.getByRole("heading", { name: "Agenda da Copa" })).toBeVisible();
    await expect(page.getByText("Copa do Mundo · Jun–Jul 2026")).toBeVisible();
  });

  test("lista os jogos mockados da fase de grupos", async ({ page }) => {
    await page.goto("/calendario");
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
    // Garante que a agenda carregou com jogos antes de filtrar.
    await expect(page.getByText("Brasil", { exact: true }).first()).toBeVisible();

    // Vai para a semana anterior (antes do início da Copa: sem jogos em nenhum dia).
    await page.getByRole("button", { name: "Semana anterior" }).click();
    // Seleciona o primeiro dia dessa semana → filtro por dia vazio.
    await seletorSemana(page).getByRole("button").first().click();

    await expect(page.getByText("Nenhum jogo neste dia.")).toBeVisible();
  });

  test("desmarcar o dia volta a exibir todos os jogos", async ({ page }) => {
    await page.goto("/calendario");
    await page.getByRole("button", { name: "Semana anterior" }).click();

    const primeiroDia = seletorSemana(page).getByRole("button").first();
    await primeiroDia.click();
    await expect(page.getByText("Nenhum jogo neste dia.")).toBeVisible();

    // Clicar de novo no mesmo dia (toggle) remove o filtro.
    await primeiroDia.click();
    await expect(page.getByText("Nenhum jogo neste dia.")).toHaveCount(0);
    await expect(page.getByText("Brasil", { exact: true }).first()).toBeVisible();
  });
});
