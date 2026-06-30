import type { Partida } from "./partida";

export type VarianteStatusBadge = "ao-vivo" | "em-breve" | "agendado" | "encerrado";

export interface StatusBadge {
  variante: VarianteStatusBadge;
  rotulo: string;
  comPulso: boolean;
}

/** Um jogo agendado vira "EM BREVE" quando começa dentro desta janela. */
const JANELA_EM_BREVE_MS = 3 * 60 * 60 * 1000;

export function derivarStatusBadge(partida: Partida, agora: number = Date.now()): StatusBadge {
  if (partida.status === "ao-vivo") {
    return { variante: "ao-vivo", rotulo: "AO VIVO", comPulso: true };
  }
  if (partida.status === "encerrada") {
    return { variante: "encerrado", rotulo: "ENCERRADO", comPulso: false };
  }

  const iminente = new Date(partida.dataHora).getTime() - agora <= JANELA_EM_BREVE_MS;
  return iminente
    ? { variante: "em-breve", rotulo: "EM BREVE", comPulso: false }
    : { variante: "agendado", rotulo: "AGENDADO", comPulso: false };
}
