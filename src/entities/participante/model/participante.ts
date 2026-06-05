export interface Participante {
  id: string;
  nome: string;
  /** Iniciais ou URL de avatar para exibição no ranking. */
  avatar: string | null;
  pontosTotais: number;
}
