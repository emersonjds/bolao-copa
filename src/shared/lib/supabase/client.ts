import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client do Supabase para o browser (SPA static export).
 *
 * Usa a PUBLISHABLE KEY — pública por design; a proteção dos dados é a RLS
 * no Postgres, não o segredo da chave. A `service_role` NUNCA vem para cá.
 */
let browserClient: SupabaseClient | undefined;

/** Devolve o client do Supabase (singleton no browser). */
export function getSupabaseBrowserClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local"
    );
  }

  // PKCE explícito: a troca do código pela sessão acontece na nossa rota
  // /auth/callback (detectSessionInUrl desligado para esse controle ser nosso).
  browserClient ??= createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: false,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  return browserClient;
}
