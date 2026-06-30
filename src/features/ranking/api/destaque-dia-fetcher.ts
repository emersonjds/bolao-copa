import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { DestaqueDia } from "@/entities/ranking";

interface DestaqueDiaRpc {
  dia: string;
  participante_id: string;
  nome: string;
  avatar_url: string | null;
  pontos_dia: number;
}

function mapDestaqueDia(rpc: DestaqueDiaRpc): DestaqueDia {
  return {
    dia: rpc.dia,
    participanteId: rpc.participante_id,
    nome: rpc.nome,
    avatarUrl: rpc.avatar_url,
    pontosDia: rpc.pontos_dia,
  };
}

/**
 * @param dia - Dia a consultar (ISO `YYYY-MM-DD`). Se omitido, a RPC usa o dia
 *   do jogo encerrado mais recente (fuso de Brasília).
 *
 * Array vazio significa que nenhum jogo do dia foi encerrado ainda, ou que
 * todos os participantes pontuaram 0 (sem destaque).
 */
export async function listarDestaqueDia(dia?: string): Promise<DestaqueDia[]> {
  const supabase = getSupabaseBrowserClient();

  // Parâmetro opcional na RPC (default null → dia mais recente). Omitir quando
  // não há dia explícito para o Postgres usar o default da função.
  const { data, error } = await supabase.rpc(
    "get_destaque_dia",
    dia !== undefined ? { p_data: dia } : {}
  );

  if (error) {
    throw new Error(`Falha ao carregar craque do dia: ${error.message}`);
  }

  return (data as unknown as DestaqueDiaRpc[]).map(mapDestaqueDia);
}
