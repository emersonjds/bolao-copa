import type { BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { buildSupabaseAuthCookies } from "./auth-cookie";

/**
 * Loga uma conta do cenário (Supabase local) injetando o cookie de sessão —
 * o app só tem Google OAuth, que não roda no local. Mesmo truque do auth.setup,
 * mas por contexto, sem mexer no storageState compartilhado.
 */
export async function loginComo(context: BrowserContext, email: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const senha = process.env.E2E_TEST_PASSWORD ?? "Senha-Demo-2026!";

  const supa = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supa.auth.signInWithPassword({ email, password: senha });
  if (error || !data.session)
    throw new Error(`login ${email} falhou: ${error?.message ?? "sem sessão"}`);

  const expires = data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
  await context.addCookies(
    buildSupabaseAuthCookies(url, data.session).map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax" as const,
      expires,
    }))
  );
}
