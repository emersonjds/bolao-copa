import { describe, it, expect } from "vitest";
import type { Partida } from "@/entities/partida";
import { agruparProximosDias } from "./agrupar-por-dia";

function makePartida(
  id: string,
  dataHora: string,
  status: Partida["status"] = "agendada"
): Partida {
  return {
    id,
    fase: "grupos",
    grupo: "A",
    dataHora,
    estadio: "Estádio",
    status,
    mandante: { id: "m", nome: "Mandante", codigo: "MAN" },
    visitante: { id: "v", nome: "Visitante", codigo: "VIS" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
  };
}

describe("agruparProximosDias", () => {
  it("ignora jogos encerrados", () => {
    const grupos = agruparProximosDias([
      makePartida("a", "2026-06-11T19:00:00.000Z", "encerrada"),
      makePartida("b", "2026-06-11T22:00:00.000Z", "agendada"),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].jogos.map((jogo) => jogo.id)).toEqual(["b"]);
  });

  it("limita aos próximos 2 dias com jogo, na ordem cronológica", () => {
    const grupos = agruparProximosDias([
      makePartida("d3", "2026-06-13T19:00:00.000Z"),
      makePartida("d1", "2026-06-11T19:00:00.000Z"),
      makePartida("d2", "2026-06-12T19:00:00.000Z"),
    ]);
    expect(grupos.map((grupo) => grupo.data)).toEqual(["2026-06-11", "2026-06-12"]);
  });

  it("inclui todos os jogos do mesmo dia", () => {
    const grupos = agruparProximosDias([
      makePartida("a", "2026-06-11T16:00:00.000Z"),
      makePartida("b", "2026-06-11T19:00:00.000Z"),
      makePartida("c", "2026-06-11T22:00:00.000Z"),
    ]);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].jogos).toHaveLength(3);
  });

  it("respeita o parâmetro maxDias", () => {
    const grupos = agruparProximosDias(
      [
        makePartida("d1", "2026-06-11T19:00:00.000Z"),
        makePartida("d2", "2026-06-12T19:00:00.000Z"),
        makePartida("d3", "2026-06-13T19:00:00.000Z"),
      ],
      3
    );
    expect(grupos).toHaveLength(3);
  });

  it("retorna vazio quando não há jogos futuros", () => {
    expect(
      agruparProximosDias([makePartida("a", "2026-06-11T19:00:00.000Z", "encerrada")])
    ).toEqual([]);
  });
});
