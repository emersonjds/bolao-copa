import type { Partida } from "@/entities/partida";

const VINTE_E_QUATRO_HORAS = 24 * 60 * 60 * 1000;

/**
 * Primeiro jogo AGENDADO dentro das próximas 24h, ou null.
 *
 * Compartilhado entre o card de destaque da home e a lista "Próximos jogos"
 * (que exclui esse jogo para não duplicar a visão). `agora` é injetável para
 * testes determinísticos.
 */
export function encontrarProximoJogo(
  partidas: readonly Partida[],
  agora: number = Date.now()
): Partida | null {
  const limite24h = agora + VINTE_E_QUATRO_HORAS;

  const candidatos = partidas
    .filter((partida) => {
      if (partida.status !== "agendada") return false;
      const inicio = new Date(partida.dataHora).getTime();
      return inicio >= agora && inicio <= limite24h;
    })
    .slice()
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  return candidatos[0] ?? null;
}
