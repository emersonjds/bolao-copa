import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";

/**
 * Histórico de palpites do próprio usuário: um item por jogo já travado (apito
 * dado), com o palpite feito (ou ausência dele) e os pontos apurados. Derivado
 * 100% no cliente a partir de partidas + meus palpites — sem query nova.
 */

export interface ItemHistorico {
  partida: Partida;
  /** null quando o usuário não palpitou neste jogo ("sem palpite"). */
  palpite: Palpite | null;
  /** Pontos apurados; null quando ainda não saiu o resultado ("a apurar"). */
  pontos: number | null;
}

export interface Historico {
  /** Jogos travados, mais recente primeiro. */
  itens: ItemHistorico[];
  totalPontos: number;
  jogosApurados: number;
}

/** Travado = apito já dado: status diferente de "agendada" OU já passou da hora. */
function estaTravado(partida: Partida, agora: Date): boolean {
  return partida.status !== "agendada" || new Date(partida.dataHora) <= agora;
}

export function derivarHistorico(
  partidas: Partida[],
  palpites: Palpite[],
  agora: Date = new Date()
): Historico {
  const palpitePorPartida = new Map(palpites.map((p) => [p.partidaId, p]));

  const itens: ItemHistorico[] = partidas
    .filter((partida) => estaTravado(partida, agora))
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
    .map((partida) => {
      const palpite = palpitePorPartida.get(partida.id) ?? null;
      return { partida, palpite, pontos: palpite?.pontos ?? null };
    });

  const apurados = itens.filter((item) => item.pontos !== null);
  const totalPontos = apurados.reduce((soma, item) => soma + (item.pontos ?? 0), 0);

  return { itens, totalPontos, jogosApurados: apurados.length };
}
