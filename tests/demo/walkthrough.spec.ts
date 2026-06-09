import { test, devices } from "@playwright/test";
import { loginComo } from "../e2e/helpers/login-demo";

/**
 * Vídeo de demonstração (apresentação) — NÃO é um teste de verificação.
 * Passeia, logado como a conta demo, pelas telas principais em enquadramento
 * mobile, com pausas e rolagem suave, e salva o vídeo em demo/walkthrough.webm.
 *
 * Pré-requisitos: `supabase start` + `pnpm scenario:seed`.
 * Rode com: `pnpm demo` (config playwright.demo.config.ts).
 */

const VIEWPORT = { width: 390, height: 844 };

test("walkthrough do app (mobile)", async ({ browser }) => {
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    recordVideo: { dir: "test-results/demo-raw", size: VIEWPORT },
  });
  await loginComo(context, "demo@bolao.test");
  const page = await context.newPage();

  const pausa = (ms: number) => page.waitForTimeout(ms);
  const rolar = async (px: number) => {
    await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), px);
    await pausa(1400);
  };
  const abrir = async (rota: string, espera = 1800) => {
    await page.goto(rota);
    await page.waitForLoadState("networkidle");
    await pausa(espera);
  };

  // 1. Home — próximos jogos
  await abrir("/");
  await rolar(320);

  // 2. Palpites — preenche um placar pra mostrar a interação
  await abrir("/palpites");
  const inputs = page.locator('input[type="number"]:not([disabled])');
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill("2");
    await pausa(500);
    await inputs.nth(1).fill("1");
    await pausa(1300);
  }
  await rolar(320);

  // 3. Premiação — pote, PIX (QR + copia e cola), aviso e divisão
  await abrir("/premiacao");
  await rolar(300);
  await rolar(340);
  await rolar(340);

  // 4. Regras — base, multiplicador, tabela por fase e desempate
  await abrir("/regras", 1400);
  await rolar(340);
  await rolar(340);
  await rolar(340);
  await rolar(340);

  // 5. Ranking — pódio e craque
  await abrir("/ranking", 2200);

  const video = page.video();
  await context.close(); // finaliza a gravação
  if (video) await video.saveAs("demo/walkthrough.webm");
});
