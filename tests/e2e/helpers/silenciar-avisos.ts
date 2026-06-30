import type { Page } from "@playwright/test";

const TODOS_AVISOS = [
  "novidades-2026-06",
  "mata-mata-2026-06",
  "oitavas-2026",
  "quartas-2026",
  "semifinal-2026",
  "final-2026",
  "pontuacao-mata-mata-2026-06",
  "chaveamento-2026",
];

/**
 * Marca todos os avisos como vistos no localStorage antes da página carregar.
 * Impede que modais de aviso bloqueiem cliques em specs que não testam os modais.
 * Chame antes de page.goto(); usa addInitScript, que roda em cada nova navegação.
 */
export async function silenciarAvisos(page: Page): Promise<void> {
  await page.addInitScript((ids: string[]) => {
    for (const id of ids) localStorage.setItem(`aviso-visto:${id}`, "1");
  }, TODOS_AVISOS);
}
