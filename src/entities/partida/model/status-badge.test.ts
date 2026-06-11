import { describe, it, expect } from "vitest";
import type { Partida } from "./partida";
import { derivarStatusBadge } from "./status-badge";

const AGORA = new Date("2026-06-11T12:00:00Z").getTime();
const HORA = 60 * 60 * 1000;

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T19:00:00Z",
    janelaInicio: "2026-06-11T03:00:00Z",
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

describe("derivarStatusBadge", () => {
  it("ao vivo tem rótulo e pulso", () => {
    const badge = derivarStatusBadge(makePartida({ status: "ao-vivo" }), AGORA);
    expect(badge).toEqual({ variante: "ao-vivo", rotulo: "AO VIVO", comPulso: true });
  });

  it("encerrada vira ENCERRADO", () => {
    const badge = derivarStatusBadge(makePartida({ status: "encerrada" }), AGORA);
    expect(badge).toEqual({ variante: "encerrado", rotulo: "ENCERRADO", comPulso: false });
  });

  it("agendada distante vira AGENDADO", () => {
    const badge = derivarStatusBadge(
      makePartida({ dataHora: new Date(AGORA + 6 * HORA).toISOString() }),
      AGORA
    );
    expect(badge).toEqual({ variante: "agendado", rotulo: "AGENDADO", comPulso: false });
  });

  it("agendada que começa em até 3h vira EM BREVE", () => {
    const badge = derivarStatusBadge(
      makePartida({ dataHora: new Date(AGORA + 2 * HORA).toISOString() }),
      AGORA
    );
    expect(badge).toEqual({ variante: "em-breve", rotulo: "EM BREVE", comPulso: false });
  });

  it("exatamente 3h ainda é EM BREVE (limite inclusivo)", () => {
    const badge = derivarStatusBadge(
      makePartida({ dataHora: new Date(AGORA + 3 * HORA).toISOString() }),
      AGORA
    );
    expect(badge.variante).toBe("em-breve");
  });
});
