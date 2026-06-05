export interface Palpite {
  id: string;
  participanteId: string;
  partidaId: string;
  golsMandante: number;
  golsVisitante: number;
  /** Pontos apurados após o resultado; null enquanto a partida não encerra. */
  pontos: number | null;
}
