"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "./client";

/**
 * Hook de camada shared que expõe o usuário autenticado atual do Supabase.
 *
 * Existe aqui (e não em features/auth) para que features como palpites e
 * ranking possam ler a identidade do usuário sem cruzar a fronteira entre
 * features — regra do Feature-Sliced Design.
 *
 * O AuthProvider (features/auth) mantém sua própria assinatura para a UI
 * global; múltiplas assinaturas ao mesmo cliente Supabase são seguras e
 * independentes — o GoTrue client interno faz fan-out dos eventos.
 */
export function useSupabaseUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    // Lê a sessão local (localStorage/cookie) sem fazer chamada de rede —
    // elimina o waterfall de ~100-300ms antes das queries de participante/palpites.
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null))
      .catch(() => setUser(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return user;
}
