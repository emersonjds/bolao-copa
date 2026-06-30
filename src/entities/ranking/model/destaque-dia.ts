/**
 * Participante(s) com maior soma de pontos em um dia de jogos.
 * Retornado pela RPC get_destaque_dia() do Supabase.
 *
 * Em caso de empate na liderança, a RPC devolve uma linha por participante
 * — todos com o mesmo valor em `pontosDia`.
 */
export interface DestaqueDia {
  /** Dia dos jogos (ISO `YYYY-MM-DD`, fuso de Brasília). */
  dia: string;
  participanteId: string;
  nome: string;
  avatarUrl: string | null;
  pontosDia: number;
}
