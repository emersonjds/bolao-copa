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
  avatarUrl: string | null;
  pontosRodada: number;
}
