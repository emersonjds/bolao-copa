import { describe, it, expect } from "vitest";
import { derivarHistorico } from "./derivar-historico";
import type { Partida, Selecao } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";

const AGORA = new Date("2026-06-15T00:00:00Z");

function selecao(nome: string): Selecao {
  return { id: `sel-${nome}`, nome, codigo: nome.slice(0, 3).toUpperCase() };
}

function partida(over: Partial<Partida> & Pick<Partida, "id" | "dataHora">): Partida {
  return {
    fase: "grupos",
    grupo: "A",
    estadio: "Estádio",
    status: "agendada",
    mandante: selecao("Brasil"),
    visitante: selecao("Sérvia"),
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...over,
  };
}

function palpite(over: Partial<Palpite> & Pick<Palpite, "partidaId">): Palpite {
  return {
    id: `palpite-${over.partidaId}`,
    participanteId: "part-1",
    golsMandante: 0,
    golsVisitante: 0,
    pontos: null,
    ...over,
  };
}

describe("derivarHistorico", () => {
  it("inclui só jogos travados (apito dado), excluindo os abertos", () => {
    const partidas = [
      partida({ id: "futuro", dataHora: "2026-06-20T16:00:00Z" }), // ainda agendado
      partida({ id: "passado", dataHora: "2026-06-11T16:00:00Z", status: "encerrada" }),
    ];
    const { itens } = derivarHistorico(partidas, [], AGORA);
    expect(itens.map((i) => i.partida.id)).toEqual(["passado"]);
  });

  it("considera travado quando a hora já passou, mesmo com status agendada", () => {
    const partidas = [partida({ id: "comecou", dataHora: "2026-06-14T16:00:00Z" })];
    const { itens } = derivarHistorico(partidas, [], AGORA);
    expect(itens).toHaveLength(1);
  });

  it("ordena do mais recente para o mais antigo", () => {
    const partidas = [
      partida({ id: "a", dataHora: "2026-06-11T16:00:00Z", status: "encerrada" }),
      partida({ id: "b", dataHora: "2026-06-13T16:00:00Z", status: "encerrada" }),
      partida({ id: "c", dataHora: "2026-06-12T16:00:00Z", status: "encerrada" }),
    ];
    const { itens } = derivarHistorico(partidas, [], AGORA);
    expect(itens.map((i) => i.partida.id)).toEqual(["b", "c", "a"]);
  });

  it("marca 'sem palpite' (palpite null) quando o usuário não palpitou", () => {
    const partidas = [partida({ id: "x", dataHora: "2026-06-11T16:00:00Z", status: "encerrada" })];
    const { itens } = derivarHistorico(partidas, [], AGORA);
    expect(itens[0].palpite).toBeNull();
    expect(itens[0].pontos).toBeNull();
  });

  it("expõe 'a apurar' (pontos null) para jogo travado sem resultado", () => {
    const partidas = [partida({ id: "x", dataHora: "2026-06-14T16:00:00Z", status: "ao-vivo" })];
    const palpites = [palpite({ partidaId: "x", golsMandante: 2, golsVisitante: 1 })];
    const { itens, jogosApurados, totalPontos } = derivarHistorico(partidas, palpites, AGORA);
    expect(itens[0].palpite?.golsMandante).toBe(2);
    expect(itens[0].pontos).toBeNull();
    expect(jogosApurados).toBe(0);
    expect(totalPontos).toBe(0);
  });

  it("soma pontos e conta só jogos apurados", () => {
    const partidas = [
      partida({ id: "a", dataHora: "2026-06-11T16:00:00Z", status: "encerrada" }),
      partida({ id: "b", dataHora: "2026-06-12T16:00:00Z", status: "encerrada" }),
      partida({ id: "c", dataHora: "2026-06-13T16:00:00Z", status: "ao-vivo" }),
    ];
    const palpites = [
      palpite({ partidaId: "a", pontos: 5 }),
      palpite({ partidaId: "b", pontos: 1 }),
      palpite({ partidaId: "c", pontos: null }), // a apurar
    ];
    const { totalPontos, jogosApurados } = derivarHistorico(partidas, palpites, AGORA);
    expect(totalPontos).toBe(6);
    expect(jogosApurados).toBe(2);
  });
});
