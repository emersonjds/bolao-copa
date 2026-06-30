import { describe, it, expect } from "vitest";
import type { Partida } from "@/entities/partida";
import { derivarBracket } from "./derivar-bracket";

// Seleção não resolvida: id vazio é o sinal canônico (mapSelecao retorna id:"" quando mandante_id é null)
const SELECAO_VAZIA = { id: "", nome: "", codigo: "" };

function makePartida(overrides: Partial<Partida> & { id: string; fase: Partida["fase"] }): Partida {
  return {
    grupo: null,
    dataHora: "2026-06-30T20:00:00Z",
    janelaInicio: "2026-06-30T03:00:00Z",
    estadio: "Estádio",
    status: "agendada",
    mandante: SELECAO_VAZIA,
    visitante: SELECAO_VAZIA,
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...overrides,
  };
}

describe("derivarBracket", () => {
  it("retorna rodadas na ordem correta de fases", () => {
    const partidas: Partida[] = [
      makePartida({ id: "f1", fase: "final", mandanteLabel: "W101", visitanteLabel: "W102" }),
      makePartida({ id: "s1", fase: "semifinal", mandanteLabel: "W89", visitanteLabel: "W90" }),
      makePartida({ id: "q1", fase: "quartas", mandanteLabel: "W81", visitanteLabel: "W82" }),
      makePartida({ id: "o1", fase: "oitavas", mandanteLabel: "W73", visitanteLabel: "W74" }),
      makePartida({ id: "r1", fase: "trinta-e-dois", mandanteLabel: "1A", visitanteLabel: "2B" }),
      makePartida({ id: "t1", fase: "terceiro-lugar", mandanteLabel: "L101", visitanteLabel: "L102" }),
    ];

    const rodadas = derivarBracket(partidas);
    const fases = rodadas.map((r) => r.fase);

    expect(fases).toEqual([
      "trinta-e-dois",
      "oitavas",
      "quartas",
      "semifinal",
      "terceiro-lugar",
      "final",
    ]);
  });

  it("titulo PT-BR correto para cada fase", () => {
    const titulos: Record<string, string> = {
      "trinta-e-dois": "32-avos",
      oitavas: "Oitavas",
      quartas: "Quartas",
      semifinal: "Semifinal",
      "terceiro-lugar": "Disputa de 3º lugar",
      final: "Final",
    };

    const partidas: Partida[] = Object.keys(titulos).map((fase, i) =>
      makePartida({ id: `p${i}`, fase: fase as Partida["fase"], mandanteLabel: "1A", visitanteLabel: "2B" })
    );

    const rodadas = derivarBracket(partidas);
    for (const rodada of rodadas) {
      expect(rodada.titulo).toBe(titulos[rodada.fase]);
    }
  });

  it("placeholder W74 → 'Vencedor 74'", () => {
    const partidas = [
      makePartida({ id: "p1", fase: "oitavas", mandanteLabel: "W74", visitanteLabel: "W75" }),
    ];
    const rodadas = derivarBracket(partidas);
    expect(rodadas[0].confrontos[0].mandante.placeholder).toBe("Vencedor 74");
    expect(rodadas[0].confrontos[0].visitante.placeholder).toBe("Vencedor 75");
  });

  it("placeholder L101 → 'Perdedor 101'", () => {
    const partidas = [
      makePartida({ id: "p1", fase: "terceiro-lugar", mandanteLabel: "L101", visitanteLabel: "L102" }),
    ];
    const rodadas = derivarBracket(partidas);
    expect(rodadas[0].confrontos[0].mandante.placeholder).toBe("Perdedor 101");
    expect(rodadas[0].confrontos[0].visitante.placeholder).toBe("Perdedor 102");
  });

  it("rótulo de grupo mantém o texto original", () => {
    const partidas = [
      makePartida({ id: "p1", fase: "trinta-e-dois", mandanteLabel: "1A", visitanteLabel: "2B" }),
    ];
    const rodadas = derivarBracket(partidas);
    expect(rodadas[0].confrontos[0].mandante.placeholder).toBe("1A");
    expect(rodadas[0].confrontos[0].visitante.placeholder).toBe("2B");
  });

  it("seleção resolvida aparece em selecao e no placeholder", () => {
    const bra = { id: "bra", nome: "Brasil", codigo: "BRA" };
    const arg = { id: "arg", nome: "Argentina", codigo: "ARG" };
    const partidas = [
      makePartida({
        id: "p1",
        fase: "oitavas",
        mandante: bra,
        visitante: arg,
        mandanteLabel: "W73",
        visitanteLabel: "W74",
      }),
    ];
    const rodadas = derivarBracket(partidas);
    const { mandante, visitante } = rodadas[0].confrontos[0];

    expect(mandante.selecao).toEqual(bra);
    expect(mandante.placeholder).toBe("Brasil");
    expect(visitante.selecao).toEqual(arg);
    expect(visitante.placeholder).toBe("Argentina");
  });

  it("vencedor=true no lado com mais gols quando encerrada", () => {
    const bra = { id: "bra", nome: "Brasil", codigo: "BRA" };
    const arg = { id: "arg", nome: "Argentina", codigo: "ARG" };
    const partidas = [
      makePartida({
        id: "p1",
        fase: "oitavas",
        status: "encerrada",
        mandante: bra,
        visitante: arg,
        golsMandante: 2,
        golsVisitante: 1,
        mandanteLabel: null,
        visitanteLabel: null,
      }),
    ];
    const rodadas = derivarBracket(partidas);
    const { mandante, visitante } = rodadas[0].confrontos[0];

    expect(mandante.vencedor).toBe(true);
    expect(visitante.vencedor).toBe(false);
    expect(mandante.gols).toBe(2);
    expect(visitante.gols).toBe(1);
  });

  it("vencedor=true via vencedorPenaltis no empate", () => {
    const bra = { id: "bra", nome: "Brasil", codigo: "BRA" };
    const arg = { id: "arg", nome: "Argentina", codigo: "ARG" };
    const partidas = [
      makePartida({
        id: "p1",
        fase: "quartas",
        status: "encerrada",
        mandante: bra,
        visitante: arg,
        golsMandante: 1,
        golsVisitante: 1,
        vencedorPenaltis: "arg",
        mandanteLabel: null,
        visitanteLabel: null,
      }),
    ];
    const rodadas = derivarBracket(partidas);
    const { mandante, visitante } = rodadas[0].confrontos[0];

    expect(mandante.vencedor).toBe(false);
    expect(visitante.vencedor).toBe(true);
  });

  it("gols null e vencedor=false quando não encerrada", () => {
    const partidas = [
      makePartida({ id: "p1", fase: "final", mandanteLabel: "W101", visitanteLabel: "W102" }),
    ];
    const rodadas = derivarBracket(partidas);
    const { mandante, visitante } = rodadas[0].confrontos[0];

    expect(mandante.gols).toBeNull();
    expect(visitante.gols).toBeNull();
    expect(mandante.vencedor).toBe(false);
    expect(visitante.vencedor).toBe(false);
  });

  it("status é propagado para o confronto", () => {
    const partidas = [
      makePartida({ id: "p1", fase: "semifinal", status: "ao-vivo", mandanteLabel: "W89", visitanteLabel: "W90" }),
    ];
    const rodadas = derivarBracket(partidas);
    expect(rodadas[0].confrontos[0].status).toBe("ao-vivo");
  });

  it("usa numero da partida quando disponível e ordena por ele", () => {
    const partidas = [
      makePartida({ id: "p2", fase: "oitavas", numero: 90, mandanteLabel: "W74", visitanteLabel: "W75" }),
      makePartida({ id: "p1", fase: "oitavas", numero: 89, mandanteLabel: "W73", visitanteLabel: "W74" }),
    ];
    const rodadas = derivarBracket(partidas);
    const numeros = rodadas[0].confrontos.map((c) => c.numero);
    expect(numeros).toEqual([89, 90]);
  });

  it("fallback para offset da fase quando numero é null", () => {
    // oitavas: offset 89 → 1ª posição=89, 2ª=90
    const partidas = [
      makePartida({ id: "p1", fase: "oitavas", mandanteLabel: "W73", visitanteLabel: "W74" }),
      makePartida({ id: "p2", fase: "oitavas", mandanteLabel: "W74", visitanteLabel: "W75" }),
    ];
    const rodadas = derivarBracket(partidas);
    const numeros = rodadas[0].confrontos.map((c) => c.numero);
    expect(numeros).toEqual([89, 90]);
  });

  it("omite fases sem partidas", () => {
    const partidas = [
      makePartida({ id: "p1", fase: "final", mandanteLabel: "W101", visitanteLabel: "W102" }),
    ];
    const rodadas = derivarBracket(partidas);
    expect(rodadas).toHaveLength(1);
    expect(rodadas[0].fase).toBe("final");
  });
});
