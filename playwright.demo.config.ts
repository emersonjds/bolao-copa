import { defineConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Config DEDICADA ao vídeo de demonstração (apresentação) — separada do
 * playwright.config.ts dos testes. Grava um walkthrough mobile das telas. Roda
 * contra o app local (`pnpm dev`) + Supabase local; nunca toca em produção.
 */

// Carrega .env.test (Supabase LOCAL) — mesmo parser do playwright.config.
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

const alvo = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (alvo && !alvo.includes("127.0.0.1") && !alvo.includes("localhost")) {
  throw new Error(`DEMO ABORTADO: NEXT_PUBLIC_SUPABASE_URL não é local ("${alvo}").`);
}

export default defineConfig({
  testDir: "./tests/demo",
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
