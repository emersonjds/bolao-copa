import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { BOLAO_PADRAO_ID } from "@/shared/lib/constants";

/**
 * Conta os participantes do bolão padrão. Usa `head: true` + `count: 'exact'`
 * para não trafegar linhas — só o número. A RLS de leitura de participantes já
 * libera para authenticated.
 */
export async function contarInscritos(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { count, error } = await supabase
    .from("participantes")
    .select("id", { count: "exact", head: true })
    .eq("bolao_id", BOLAO_PADRAO_ID);

  if (error) {
    throw new Error(`Falha ao contar inscritos: ${error.message}`);
  }
  return count ?? 0;
}
