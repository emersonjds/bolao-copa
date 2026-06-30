import { describe, it, expect } from "vitest";
import { resolverMataMata, type PartidaResultado } from "./resolver-mata-mata";

function enc(
  numero: number,
  fase: PartidaResultado["fase"],
  m: string,
  v: string,
  gm: number,
  gv: number,
  pen: string | null = null,
): PartidaResultado {
  return {
    numero,
    fase,
    mandanteId: m,
    visitanteId: v,
    golsMandante: gm,
    golsVisitante: gv,
    vencedorPenaltis: pen,
    status: "encerrada",
  };
}
function aberta(numero: number, fase: PartidaResultado["fase"]): PartidaResultado {
  return {
    numero,
    fase,
    mandanteId: null,
    visitanteId: null,
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    status: "agendada",
  };
}

describe("resolverMataMata", () => {
  it("resolve uma oitava: vencedores das 32-avos 74 e 77 viram mandante/visitante", () => {
    const p = [
      enc(74, "trinta-e-dois", "BRA", "ARG", 2, 1),
      enc(77, "trinta-e-dois", "FRA", "ESP", 0, 3),
      aberta(89, "oitavas"),
    ];
    const r = resolverMataMata(p);
    expect(r).toContainEqual({
      fase: "oitavas",
      mandanteLabel: "W74",
      visitanteLabel: "W77",
      mandanteId: "BRA",
      visitanteId: "ESP",
    });
  });

  it("empate no tempo normal usa o vencedor dos pênaltis para avançar", () => {
    const p = [
      enc(73, "trinta-e-dois", "ITA", "GER", 1, 1, "GER"),
      enc(75, "trinta-e-dois", "POR", "NED", 2, 0),
      aberta(90, "oitavas"),
    ];
    const r = resolverMataMata(p);
    expect(r[0]).toMatchObject({ mandanteId: "GER", visitanteId: "POR" });
  });

  it("não resolve quando só um lado está determinado", () => {
    const p = [enc(74, "trinta-e-dois", "BRA", "ARG", 2, 1), aberta(89, "oitavas")]; // falta 77
    expect(resolverMataMata(p)).toEqual([]);
  });

  it("ignora partida já resolvida (idempotência)", () => {
    const p = [
      enc(74, "trinta-e-dois", "BRA", "ARG", 2, 1),
      enc(77, "trinta-e-dois", "FRA", "ESP", 0, 3),
      { ...aberta(89, "oitavas"), mandanteId: "BRA", visitanteId: "ESP" },
    ];
    expect(resolverMataMata(p)).toEqual([]);
  });

  it("terceiro lugar recebe os PERDEDORES das semis", () => {
    const p = [
      enc(101, "semifinal", "BRA", "FRA", 2, 0),
      enc(102, "semifinal", "ARG", "ESP", 1, 1, "ARG"),
      aberta(103, "terceiro-lugar"),
      aberta(104, "final"),
    ];
    const r = resolverMataMata(p);
    expect(r).toContainEqual({
      fase: "terceiro-lugar",
      mandanteLabel: "L101",
      visitanteLabel: "L102",
      mandanteId: "FRA",
      visitanteId: "ESP",
    });
    expect(r).toContainEqual({
      fase: "final",
      mandanteLabel: "W101",
      visitanteLabel: "W102",
      mandanteId: "BRA",
      visitanteId: "ARG",
    });
  });
});
