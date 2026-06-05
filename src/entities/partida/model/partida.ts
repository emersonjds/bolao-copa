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
}
