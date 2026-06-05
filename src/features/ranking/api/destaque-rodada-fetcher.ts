import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { DestaqueRodada } from "@/entities/ranking";

// ---------------------------------------------------------------------------
// Tipo interno — formato bruto retornado pela RPC (snake_case do Postgres)
// ---------------------------------------------------------------------------

interface DestaqueRodadaRpc {
  rodada: number;
  participante_id: string;
  nome: string;
  avatar_url: string | null;
  pontos_rodada: number;
}

// ---------------------------------------------------------------------------
// Mapper snake_case → camelCase
// ---------------------------------------------------------------------------

function mapDestaqueRodada(rpc: DestaqueRodadaRpc): DestaqueRodada {
  return {
    rodada: rpc.rodada,
    participanteId: rpc.participante_id,
    nome: rpc.nome,
    avatarUrl: rpc.avatar_url,
    pontosRodada: rpc.pontos_rodada,
  };
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Chama a RPC get_destaque_rodada() do Supabase.
 *
 * @param rodada - Número da rodada a consultar. Se omitido (undefined), a RPC
 *   usa a última rodada que contém pelo menos um jogo encerrado/apurado.
 *
 * Retorna um array com um ou mais participantes empatados na liderança da
 * rodada. Array vazio significa que nenhum jogo da rodada foi encerrado ainda,
 * ou que todos os participantes pontuaram 0 (sem destaque).
 *
 * DEPENDÊNCIA: get_destaque_rodada() é criada na migration 0006.
 * Enquanto a função não existir no banco, o Supabase retorna PGRST202 e o
 * React Query expõe isError = true — nenhum dado é exibido. Sem ajuste
 * necessário quando a migration for aplicada.
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
