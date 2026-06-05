"use client";

import { useQuery } from "@tanstack/react-query";
import { BOLAO_PADRAO_ID } from "../constants";
import { getSupabaseBrowserClient } from "./client";
import { useSupabaseUser } from "./use-user";

/**
 * Devolve o `participante_id` do usuário logado no bolão padrão (ou null).
 * Usado para destacar "minha posição" no ranking e no dashboard sem que cada
 * tela reimplemente a consulta. `staleTime: Infinity` — não muda na sessão.
 */
export function useMeuParticipanteId(): string | null {
  const user = useSupabaseUser();

  const { data } = useQuery({
    queryKey: ["meu-participante", user?.id],
    enabled: Boolean(user),
    staleTime: Infinity,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("participantes")
        .select("id")
        .eq("user_id", user!.id)
        .eq("bolao_id", BOLAO_PADRAO_ID)
        .single();
      if (error || !data) return null;
      return data.id as string;
    },
  });

  return data ?? null;
}
