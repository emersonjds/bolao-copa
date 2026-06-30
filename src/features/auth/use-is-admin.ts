"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabaseUser, getSupabaseBrowserClient } from "@/shared/lib/supabase";

/**
 * Retorna true se o usuário logado é admin. Usa a RPC `eh_admin` (SECURITY
 * DEFINER) porque a coluna profiles.is_admin não é mais legível pelo cliente
 * (migration 0018). Cacheada indefinidamente: permissões não mudam na sessão.
 */
export function useIsAdmin(): boolean {
  const user = useSupabaseUser();

  const { data } = useQuery<boolean>({
    queryKey: ["eh-admin", user?.id],
    queryFn: async (): Promise<boolean> => {
      const { data: ehAdmin, error } = await getSupabaseBrowserClient().rpc("eh_admin");
      if (error) return false;
      return ehAdmin === true;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  return data === true;
}
