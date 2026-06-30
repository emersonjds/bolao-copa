export interface Palpite {
  id: string;
  participanteId: string;
  partidaId: string;
  golsMandante: number;
  golsVisitante: number;
  /** Pontos apurados após o resultado; null enquanto a partida não encerra. */
  pontos: number | null;
  /** Seleção escolhida para avançar quando o palpite é empate em mata-mata. */
  vencedorAvanca: string | null;
}
