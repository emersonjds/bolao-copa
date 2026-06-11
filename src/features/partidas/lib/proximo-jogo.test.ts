import { describe, it, expect } from "vitest";
import type { Partida } from "@/entities/partida";
import { encontrarProximoJogo } from "./proximo-jogo";

const HORA = 60 * 60 * 1000;
const AGORA = new Date("2026-06-11T12:00:00Z").getTime();

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "part-1",
    fase: "grupos",
    grupo: "A",
    dataHora: new Date(AGORA + 2 * HORA).toISOString(),
    janelaInicio: "2020-01-01T03:00:00Z",
    estadio: "Mexico City",
    status: "agendada",
    mandante: { id: "sel-mex", nome: "México", codigo: "MEX" },
    visitante: { id: "sel-rsa", nome: "África do Sul", codigo: "RSA" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...overrides,
  };
}

describe("encontrarProximoJogo", () => {
  it("retorna o jogo agendado mais próximo dentro das próximas 24h", () => {
    const cedo = makePartida({ id: "cedo", dataHora: new Date(AGORA + 1 * HORA).toISOString() });
    const tarde = makePartida({ id: "tarde", dataHora: new Date(AGORA + 5 * HORA).toISOString() });
    expect(encontrarProximoJogo([tarde, cedo], AGORA)?.id).toBe("cedo");
  });

  it("ignora jogos não agendados, já passados ou além das 24h", () => {
    expect(
      encontrarProximoJogo(
        [
          makePartida({ id: "ao-vivo", status: "ao-vivo" }),
          makePartida({ id: "passado", dataHora: new Date(AGORA - 2 * HORA).toISOString() }),
          makePartida({ id: "longe", dataHora: new Date(AGORA + 48 * HORA).toISOString() }),
        ],
        AGORA
      )
    ).toBeNull();
  });

  it("retorna null quando não há partidas", () => {
    expect(encontrarProximoJogo([], AGORA)).toBeNull();
  });
});
