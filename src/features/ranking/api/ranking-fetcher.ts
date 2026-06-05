import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { ItemRanking } from "@/entities/ranking";

// ---------------------------------------------------------------------------
// Tipo interno — formato bruto retornado pela RPC (snake_case)
// ---------------------------------------------------------------------------

interface ItemRankingRpc {
  participante_id: string;
  nome: string;
  avatar_url: string | null;
  pontos_totais: number;
  jogos_pontuados: number;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapItemRanking(rpc: ItemRankingRpc): ItemRanking {
  return {
    participanteId: rpc.participante_id,
    nome: rpc.nome,
    avatarUrl: rpc.avatar_url,
    pontosTotais: rpc.pontos_totais,
    jogosPontuados: rpc.jogos_pontuados,
  };
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Chama a RPC get_ranking() do Supabase, que retorna a classificação dos
 * participantes do bolão padrão ordenada por pontos_totais decrescente.
 *
 * DEPENDÊNCIA PENDENTE: get_ranking() é criada na migration 0005 (em paralelo).
 * Se a função ainda não existir no banco, o Supabase retorna erro com código
 * PGRST202 ("Could not find the function") — o React Query trata como estado
 * de erro e nenhum dado é exibido. O hook não precisa de ajuste quando a
 * migration for aplicada.
 */
export async function listarRanking(): Promise<ItemRanking[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_ranking");

  if (error) {
    throw new Error(`Falha ao carregar ranking: ${error.message}`);
  }

  return (data as unknown as ItemRankingRpc[]).map(mapItemRanking);
}
