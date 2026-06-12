import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Testes E2E de tela (Playwright). Rodam contra o app real subido pelo
 * `pnpm dev`. Mantidos em tests/e2e (fora do Vitest, que cobre unit/integração).
 */

// Carrega env para os testes (Playwright não faz isso sozinho). Parser mínimo,
// sem dotenv. .env.test (Supabase LOCAL) tem PRIORIDADE sobre .env.local (prod):
// o primeiro a definir cada chave vence, então o e2e nunca bate na produção.
for (const arquivo of [".env.test", ".env.local"]) {
  const caminho = path.join(process.cwd(), arquivo);
  if (!fs.existsSync(caminho)) continue;
  for (const linha of fs.readFileSync(caminho, "utf-8").split("\n")) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !linha.trimStart().startsWith("#") && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

// Guard anti-prod: o e2e seeda/loga usuários e SÓ pode rodar contra o local.
const alvo = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (alvo && !alvo.includes("127.0.0.1") && !alvo.includes("localhost")) {
  throw new Error(
    `E2E ABORTADO: NEXT_PUBLIC_SUPABASE_URL aponta para "${alvo}", que não é local. ` +
      `Crie um .env.test apontando para o Supabase local (supabase status).`
  );
}

const STORAGE_STATE = path.join(process.cwd(), "tests/e2e/.auth/user.json");
// Semeia "aviso-visto" no localStorage dos specs públicos: o modal de novidades
// aparece no 1º acesso e, sem isso, o backdrop cobriria os cliques. O spec
// dedicado (novidades.spec) roda em projeto próprio, sem esta semente.
const SEED_PUBLIC = path.join(process.cwd(), "tests/e2e/seed-public.json");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Limita a concorrência: são 4 projetos batendo num único `pnpm dev` + Supabase
  // local. Muitos workers saturavam o dev server e geravam timeouts esporádicos.
  workers: process.env.CI ? 2 : 4,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Cria a sessão de teste (storageState) antes dos specs autenticados.
    { name: "setup", testMatch: /auth\.setup\.ts/ },

    // Specs públicos (sem login) — não rodam o palpites.spec (autenticado).
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], storageState: SEED_PUBLIC },
      testIgnore: [/palpites\.spec\.ts/, /novidades\.spec\.ts/],
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"], storageState: SEED_PUBLIC },
      testIgnore: [/palpites\.spec\.ts/, /novidades\.spec\.ts/],
    },

    // Modal de novidades: contexto limpo (sem a semente) para o aviso aparecer.
    {
      name: "novidades",
      testMatch: /novidades\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Specs autenticados — reaproveitam o storageState do setup.
    {
      name: "authenticated",
      testMatch: /palpites\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
