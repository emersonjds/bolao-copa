/**
 * Item de classificação retornado pela RPC get_ranking() do Supabase.
 * A função agrega palpites.pontos por participante e devolve a tabela
 * ordenada por pontos_totais decrescente.
 */
export interface ItemRanking {
  participanteId: string;
  nome: string;
  /** URL do avatar do perfil Google; null se não disponível. */
  avatarUrl: string | null;
  pontosTotais: number;
  /** Quantidade de jogos cujo palpite gerou ao menos 1 ponto. */
  jogosPontuados: number;
}
