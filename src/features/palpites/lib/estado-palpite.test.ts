import { describe, expect, it } from "vitest";
import type { Partida } from "@/entities/partida";
import { estadoPalpite, filtrarHojeEProximoDia, proximaBorda } from "./estado-palpite";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

function partida(over: Partial<Partida>): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "",
    estadio: "x",
    status: "agendada",
    mandante: { id: "a", nome: "A", codigo: "AAA" },
    visitante: { id: "b", nome: "B", codigo: "BBB" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    janelaInicio: "",
    ...over,
  };
}

describe("estadoPalpite", () => {
  const agora = 1_000_000_000_000;
  it("liberado: janela aberta e antes do apito", () => {
    const p = partida({
      janelaInicio: new Date(agora - HORA).toISOString(),
      dataHora: new Date(agora + HORA).toISOString(),
    });
    expect(estadoPalpite(p, agora)).toBe("liberado");
  });
  it("futuro: janela ainda não abriu", () => {
    const p = partida({
      janelaInicio: new Date(agora + HORA).toISOString(),
      dataHora: new Date(agora + 5 * HORA).toISOString(),
    });
    expect(estadoPalpite(p, agora)).toBe("futuro");
  });
  it("encerrado: apito já passou", () => {
    const p = partida({
      janelaInicio: new Date(agora - 5 * HORA).toISOString(),
      dataHora: new Date(agora - HORA).toISOString(),
    });
    expect(estadoPalpite(p, agora)).toBe("encerrado");
  });
  it("encerrado: status não agendada mesmo antes do apito", () => {
    const p = partida({
      status: "encerrada",
      janelaInicio: new Date(agora - HORA).toISOString(),
      dataHora: new Date(agora + HORA).toISOString(),
    });
    expect(estadoPalpite(p, agora)).toBe("encerrado");
  });
});

describe("filtrarHojeEProximoDia", () => {
  const agora = 1_000_000_000_000;
  it("retorna liberados + só o grupo futuro de menor janela_inicio", () => {
    const hoje = partida({
      id: "hoje",
      janelaInicio: new Date(agora - HORA).toISOString(),
      dataHora: new Date(agora + HORA).toISOString(),
    });
    const amanha = partida({
      id: "amanha",
      janelaInicio: new Date(agora + DIA).toISOString(),
      dataHora: new Date(agora + DIA + HORA).toISOString(),
    });
    const depois = partida({
      id: "depois",
      janelaInicio: new Date(agora + 2 * DIA).toISOString(),
      dataHora: new Date(agora + 2 * DIA + HORA).toISOString(),
    });
    const r = filtrarHojeEProximoDia([hoje, amanha, depois], agora);
    expect(r.map((p) => p.id).sort()).toEqual(["amanha", "hoje"]);
  });
  it("sem futuros, retorna só os liberados", () => {
    const hoje = partida({
      id: "hoje",
      janelaInicio: new Date(agora - HORA).toISOString(),
      dataHora: new Date(agora + HORA).toISOString(),
    });
    expect(filtrarHojeEProximoDia([hoje], agora).map((p) => p.id)).toEqual(["hoje"]);
  });
});

describe("proximaBorda", () => {
  const agora = 1_000_000_000_000;
  it("retorna o menor instante futuro (abertura de futuro ou apito de liberado)", () => {
    const liberado = partida({
      janelaInicio: new Date(agora - HORA).toISOString(),
      dataHora: new Date(agora + 3 * HORA).toISOString(),
    });
    const futuro = partida({
      janelaInicio: new Date(agora + HORA).toISOString(),
      dataHora: new Date(agora + 6 * HORA).toISOString(),
    });
    expect(proximaBorda([liberado, futuro], agora)).toBe(agora + HORA);
  });
  it("null quando não há borda futura", () => {
    const encerrado = partida({
      janelaInicio: new Date(agora - 5 * HORA).toISOString(),
      dataHora: new Date(agora - HORA).toISOString(),
    });
    expect(proximaBorda([encerrado], agora)).toBeNull();
  });
});
