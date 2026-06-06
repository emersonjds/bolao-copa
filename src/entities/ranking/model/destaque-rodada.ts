/**
 * Participante(s) com maior soma de pontos em uma rodada específica.
 * Retornado pela RPC get_destaque_rodada() do Supabase.
 *
 * Em caso de empate na liderança, a RPC devolve uma linha por participante
 * — todos com o mesmo valor em `pontosRodada`.
 */
export interface DestaqueRodada {
  /** Índice sequencial da rodada (1 = Matchday 1, etc.). */
  rodada: number;
  participanteId: string;
  nome: string;
  /** URL do avatar do perfil; null se não disponível. */
  avatarUrl: string | null;
  /** Soma de pontos obtidos pelo participante nessa rodada. */
  pontosRodada: number;
}
