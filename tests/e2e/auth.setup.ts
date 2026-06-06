import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { buildSupabaseAuthCookies } from "./helpers/auth-cookie";

/**
 * Setup de autenticação para os specs logados. Como o login real é Google OAuth
 * (não automatizável), criamos a sessão direto pela API do Supabase:
 *   1. garante um usuário de teste (service_role) — o trigger handle_new_user
 *      cria profile + participante no bolão padrão automaticamente;
 *   2. loga com e-mail/senha (client anon) para obter uma sessão real;
 *   3. grava os cookies da sessão no storageState que o projeto "authenticated" usa.
 *
 * Sem SUPABASE_SERVICE_ROLE_KEY no ambiente, grava um estado vazio e se pula —
 * o spec autenticado também se auto-pula, então `pnpm test:e2e` não quebra.
 */

const AUTH_DIR = path.join(process.cwd(), "tests/e2e/.auth");
const STORAGE_FILE = path.join(AUTH_DIR, "user.json");
const META_FILE = path.join(AUTH_DIR, "user.meta.json");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-palpiteiro@bolao-copa.test";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "E2e-Senha-Forte-2026!";

setup("autentica o usuário de teste", async ({ context }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({ cookies: [], origins: [] }));
    fs.writeFileSync(META_FILE, JSON.stringify({ skipped: true }));
    setup.skip(true, "defina SUPABASE_SERVICE_ROLE_KEY em .env.local para o E2E autenticado");
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Idempotente: se o usuário já existir, segue para o login.
  const criado = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (criado.error && !/already|registered|exists/i.test(criado.error.message)) {
    throw new Error(`Falha ao criar usuário de teste: ${criado.error.message}`);
  }

  const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Falha no login de teste: ${error?.message ?? "sem sessão"}`);
  }

  const expires = data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
  const cookies = buildSupabaseAuthCookies(SUPABASE_URL, data.session).map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: "localhost",
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
    expires,
  }));

  await context.addCookies(cookies);
  await context.storageState({ path: STORAGE_FILE });
  fs.writeFileSync(META_FILE, JSON.stringify({ userId: data.user.id }));
});
