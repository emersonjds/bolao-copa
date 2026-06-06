import { getSupabaseBrowserClient } from "./client";

/**
 * Inicia o login com Google. O Supabase redireciona ao Google e, de volta,
 * para `/auth/callback`. `next` (opcional) é o caminho para onde voltar após logar.
 */
export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const callback = new URL("/auth/callback", window.location.origin);
  if (next) callback.searchParams.set("next", next);

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
}

/** Encerra a sessão atual. */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}
