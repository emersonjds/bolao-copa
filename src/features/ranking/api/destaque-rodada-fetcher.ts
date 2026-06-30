import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { DestaqueRodada } from "@/entities/ranking";

interface DestaqueRodadaRpc {
  rodada: number;
  participante_id: string;
  nome: string;
  avatar_url: string | null;
  pontos_rodada: number;
}

function mapDestaqueRodada(rpc: DestaqueRodadaRpc): DestaqueRodada {
  return {
    rodada: rpc.rodada,
    participanteId: rpc.participante_id,
    nome: rpc.nome,
    avatarUrl: rpc.avatar_url,
    pontosRodada: rpc.pontos_rodada,
  };
}

/**
 * @param rodada - Número da rodada a consultar. Se omitido (undefined), a RPC
 *   usa a última rodada que contém pelo menos um jogo encerrado/apurado.
 *
 * Array vazio significa que nenhum jogo da rodada foi encerrado ainda,
 * ou que todos os participantes pontuaram 0 (sem destaque).
 */
export async function listarDestaqueRodada(rodada?: number): Promise<DestaqueRodada[]> {
  const supabase = getSupabaseBrowserClient();

  // O parâmetro é opcional na RPC (default null → última rodada apurada).
  // Passamos undefined quando não há rodada explícita para que o supabase-js
  // omita o parâmetro e o Postgres use o valor default da função.
  const { data, error } = await supabase.rpc(
    "get_destaque_rodada",
    rodada !== undefined ? { p_rodada: rodada } : {}
  );

  if (error) {
    throw new Error(`Falha ao carregar destaque da rodada: ${error.message}`);
  }

  return (data as unknown as DestaqueRodadaRpc[]).map(mapDestaqueRodada);
}
