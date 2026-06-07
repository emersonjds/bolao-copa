/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Abre um Chrome JÁ LOGADO numa conta de teste, apontando pro app local.
 * O login do app é só Google OAuth (não dá contra o local), então criamos a
 * sessão via API e injetamos o cookie — o mesmo truque do tests/e2e/auth.setup.ts.
 *
 * Uso:
 *   pnpm scenario:open                 # entra como demo@bolao.test
 *   pnpm scenario:open ana@bolao.test  # entra como outra conta
 *
 * Pré-requisitos: `supabase start`, `pnpm scenario:seed` e o dev no local rodando.
 */
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { buildSupabaseAuthCookies } from "../tests/e2e/helpers/auth-cookie";

const envTest = path.join(process.cwd(), ".env.test");
for (const linha of fs.readFileSync(envTest, "utf-8").split("\n")) {
  const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !linha.trimStart().startsWith("#")) {
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Senha-Demo-2026!";
const APP = process.env.E2E_APP_URL ?? "http://localhost:3000";
const email = process.argv[2] ?? "demo@bolao.test";

async function main() {
  console.log(`→ logando como ${email}…`);
  const anon = createClient(URL, PUBLISHABLE, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`Login falhou: ${error?.message ?? "sem sessão"}`);

  const expires = data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
  const cookies = buildSupabaseAuthCookies(URL, data.session).map((c) => ({
    name: c.name,
    value: c.value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
    expires,
  }));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 412, height: 915 } });
  await context.addCookies(cookies);
  const page = await context.newPage();
  await page.goto(APP);

  console.log(`✅ Navegador aberto e logado como ${email}.`);
  console.log("   Feche a janela do Chrome (ou Ctrl+C aqui) quando terminar.");
  await new Promise(() => {}); // mantém o processo vivo enquanto você navega
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
