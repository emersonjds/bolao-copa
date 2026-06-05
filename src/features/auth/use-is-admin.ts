"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabaseUser, getSupabaseBrowserClient } from "@/shared/lib/supabase";

interface ProfileAdminRow {
  is_admin: boolean | null;
}

/**
 * Retorna true se o usuário logado tem `profiles.is_admin = true`.
 * Retorna false enquanto carrega, em caso de erro ou sem login.
 * A query é cacheada indefinidamente (`staleTime: Infinity`) — permissões
 * não mudam em tempo real na sessão corrente.
 */
export function useIsAdmin(): boolean {
  const user = useSupabaseUser();

  const { data } = useQuery<ProfileAdminRow | null>({
    queryKey: ["profiles", "is_admin", user?.id],
    queryFn: async (): Promise<ProfileAdminRow | null> => {
      if (!user) return null;

      const { data: raw, error } = await getSupabaseBrowserClient()
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (error || !raw) return null;

      // O client não tem tipagem de schema; fazemos o cast explícito via unknown.
      const row = raw as unknown as ProfileAdminRow;
      return row;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  return data?.is_admin === true;
}
