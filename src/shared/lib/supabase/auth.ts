import { getSupabaseBrowserClient } from "./client";

export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const callback = new URL("/auth/callback", window.location.origin);
  if (next) callback.searchParams.set("next", next);

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
}

/**
 * SOMENTE DEV: login direto por e-mail/senha numa conta de teste do cenário
 * local (Supabase local + `pnpm scenario:seed`), sem passar pelo Google OAuth.
 * Não use em produção — o botão que chama isto só é renderizado quando
 * `NODE_ENV === "development"`.
 */
export async function signInDev(email: string, password: string): Promise<void> {
  // Blindagem: indisponível no build de produção, mesmo que algo o chame.
  if (process.env.NODE_ENV === "production") {
    throw new Error("signInDev indisponível em produção");
  }
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}
