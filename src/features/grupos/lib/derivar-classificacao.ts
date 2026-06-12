import type { Partida, Selecao } from "@/entities/partida";

/** Uma linha da tabela de classificação (uma seleção dentro de um grupo). */
export interface LinhaClassificacao {
  selecao: Selecao;
  /** 1..4, já com a ordenação de desempate aplicada. */
  posicao: number;
  pontos: number; // P — vitória=3, empate=1, derrota=0
  jogos: number; // J — só jogos encerrados com placar
  vitorias: number; // V
  empates: number; // E
  derrotas: number; // D
  golsPro: number; // GP
  golsContra: number; // GC
  saldoGols: number; // SG = GP - GC
}

/** Classificação completa de um grupo + os jogos para o histórico. */
export interface ClassificacaoGrupo {
  grupo: string; // "A".."L" — vem do banco, sem hardcode
  linhas: LinhaClassificacao[]; // seleções já ordenadas
  jogos: Partida[]; // todos os jogos do grupo (qualquer status)
  /** true quando todos os jogos do grupo já foram encerrados. */
  finalizado: boolean;
}

interface Acumulador {
  selecao: Selecao;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsPro: number;
  golsContra: number;
}

function novoAcumulador(selecao: Selecao): Acumulador {
  return {
    selecao,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
  };
}

/**
 * Deriva a classificação de cada grupo a partir das partidas.
 *
 * É a tabela dos TIMES (3 vitória / 1 empate / 0 derrota) — não tem nenhuma
 * relação com a pontuação dos palpites (apurar_pontos no Supabase). Read-only.
 *
 * Regras:
 *  - Considera só `fase === "grupos"` com `grupo` definido.
 *  - Stats contam apenas jogos `encerrada` com placar (ignora ao-vivo/agendada,
 *    para a tabela não oscilar nem somar placar parcial).
 *  - Um time aparece mesmo sem jogo encerrado (enumerado de todos os confrontos).
 *  - Desempate: pontos → saldo de gols → gols pró → nome (alfabético). A FIFA usa
 *    confronto direto; para o bolão saldo/gols é suficiente e honesto.
 */
export function derivarClassificacao(partidas: Partida[]): ClassificacaoGrupo[] {
  const porGrupo = new Map<string, Partida[]>();
  for (const partida of partidas) {
    if (partida.fase !== "grupos" || partida.grupo === null) continue;
    const lista = porGrupo.get(partida.grupo);
    if (lista) lista.push(partida);
    else porGrupo.set(partida.grupo, [partida]);
  }

  const grupos: ClassificacaoGrupo[] = [];

  for (const [grupo, jogos] of porGrupo) {
    // Map local por grupo — nunca compartilhado entre grupos.
    const acumuladores = new Map<string, Acumulador>();

    // Enumera os times de todos os confrontos (mesmo antes de jogar).
    for (const jogo of jogos) {
      if (!acumuladores.has(jogo.mandante.id)) {
        acumuladores.set(jogo.mandante.id, novoAcumulador(jogo.mandante));
      }
      if (!acumuladores.has(jogo.visitante.id)) {
        acumuladores.set(jogo.visitante.id, novoAcumulador(jogo.visitante));
      }
    }

    // Acumula stats só dos jogos encerrados com placar.
    for (const jogo of jogos) {
      const golsMandante = jogo.golsMandante;
      const golsVisitante = jogo.golsVisitante;
      if (jogo.status !== "encerrada" || golsMandante === null || golsVisitante === null) {
        continue;
      }

      const mandante = acumuladores.get(jogo.mandante.id);
      const visitante = acumuladores.get(jogo.visitante.id);
      if (!mandante || !visitante) continue;

      mandante.jogos += 1;
      visitante.jogos += 1;
      mandante.golsPro += golsMandante;
      mandante.golsContra += golsVisitante;
      visitante.golsPro += golsVisitante;
      visitante.golsContra += golsMandante;

      if (golsMandante > golsVisitante) {
        mandante.vitorias += 1;
        mandante.pontos += 3;
        visitante.derrotas += 1;
      } else if (golsMandante < golsVisitante) {
        visitante.vitorias += 1;
        visitante.pontos += 3;
        mandante.derrotas += 1;
      } else {
        mandante.empates += 1;
        visitante.empates += 1;
        mandante.pontos += 1;
        visitante.pontos += 1;
      }
    }

    const linhas: LinhaClassificacao[] = Array.from(acumuladores.values())
      .map((acc) => ({
        selecao: acc.selecao,
        posicao: 0,
        pontos: acc.pontos,
        jogos: acc.jogos,
        vitorias: acc.vitorias,
        empates: acc.empates,
        derrotas: acc.derrotas,
        golsPro: acc.golsPro,
        golsContra: acc.golsContra,
        saldoGols: acc.golsPro - acc.golsContra,
      }))
      .sort(
        (a, b) =>
          b.pontos - a.pontos ||
          b.saldoGols - a.saldoGols ||
          b.golsPro - a.golsPro ||
          a.selecao.nome.localeCompare(b.selecao.nome, "pt-BR")
      )
      .map((linha, indice) => ({ ...linha, posicao: indice + 1 }));

    const finalizado = jogos.length > 0 && jogos.every((jogo) => jogo.status === "encerrada");

    grupos.push({ grupo, linhas, jogos, finalizado });
  }

  return grupos.sort((a, b) => a.grupo.localeCompare(b.grupo, "pt-BR"));
}
