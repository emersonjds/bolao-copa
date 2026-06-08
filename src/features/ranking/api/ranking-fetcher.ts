import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { ItemRanking } from "@/entities/ranking";

interface ItemRankingRpc {
  participante_id: string;
  nome: string;
  avatar_url: string | null;
  pontos_totais: number;
  jogos_pontuados: number;
}

function mapItemRanking(rpc: ItemRankingRpc): ItemRanking {
  return {
    participanteId: rpc.participante_id,
    nome: rpc.nome,
    avatarUrl: rpc.avatar_url,
    pontosTotais: rpc.pontos_totais,
    jogosPontuados: rpc.jogos_pontuados,
  };
}

export async function listarRanking(): Promise<ItemRanking[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_ranking");

  if (error) {
    throw new Error(`Falha ao carregar ranking: ${error.message}`);
  }

  return (data as unknown as ItemRankingRpc[]).map(mapItemRanking);
}
