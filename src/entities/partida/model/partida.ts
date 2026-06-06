export type FaseCopa =
  | "grupos"
  | "trinta-e-dois"
  | "oitavas"
  | "quartas"
  | "semifinal"
  | "terceiro-lugar"
  | "final";

export type StatusPartida = "agendada" | "ao-vivo" | "encerrada";

export interface Selecao {
  id: string;
  nome: string;
  /** Código ISO de 3 letras (ex.: "BRA"), útil para bandeira/escudo. */
  codigo: string;
}

export interface Partida {
  id: string;
  fase: FaseCopa;
  grupo: string | null;
  /** ISO 8601 (UTC) do início da partida. */
  dataHora: string;
  estadio: string;
  status: StatusPartida;
  mandante: Selecao;
  visitante: Selecao;
  /** Placar oficial; null enquanto não houver resultado. */
  golsMandante: number | null;
  golsVisitante: number | null;
  /**
   * ID da seleção vencedora nos pênaltis (só mata-mata + empate no tempo normal).
   * Não afeta pontuação — apenas para exibição.
   */
  vencedorPenaltis: string | null;
  /**
   * Rótulo do time mandante para mata-mata com times ainda indefinidos
   * (ex.: "Venc. Grupo A"). null em partidas de grupos ou quando os times já
   * estão definidos.
   */
  mandanteLabel: string | null;
  /**
   * Rótulo do time visitante para mata-mata com times ainda indefinidos.
   */
  visitanteLabel: string | null;
}
