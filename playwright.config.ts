import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Testes E2E de tela (Playwright). Rodam contra o app real subido pelo
 * `pnpm dev`. Mantidos em tests/e2e (fora do Vitest, que cobre unit/integração).
 */

// Carrega .env.local para os testes (Playwright não faz isso sozinho). Parser
// mínimo, sem dotenv; não sobrescreve o que já estiver no ambiente.
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  for (const linha of fs.readFileSync(envLocal, "utf-8").split("\n")) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const STORAGE_STATE = path.join(process.cwd(), "tests/e2e/.auth/user.json");

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /palpites\.spec\.ts/,
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      testIgnore: /palpites\.spec\.ts/,
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
