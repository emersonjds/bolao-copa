import { describe, it, expect } from "vitest";
import type { Partida, Selecao, StatusPartida } from "@/entities/partida";
import { derivarClassificacao } from "./derivar-classificacao";

function selecao(id: string, nome: string, codigo: string): Selecao {
  return { id, nome, codigo };
}

const MEX = selecao("mex", "México", "MEX");
const BRA = selecao("bra", "Brasil", "BRA");
const ARG = selecao("arg", "Argentina", "ARG");
const RSA = selecao("rsa", "África do Sul", "RSA");

interface JogoSpec {
  grupo?: string | null;
  fase?: Partida["fase"];
  status?: StatusPartida;
  mandante?: Selecao;
  visitante?: Selecao;
  golsMandante?: number | null;
  golsVisitante?: number | null;
}

let contador = 0;

function jogo(spec: JogoSpec = {}): Partida {
  contador += 1;
  return {
    id: `jogo-${contador}`,
    fase: spec.fase ?? "grupos",
    grupo: spec.grupo === undefined ? "A" : spec.grupo,
    dataHora: "2026-06-12T19:00:00.000Z",
    janelaInicio: "2026-06-12T03:00:00.000Z",
    estadio: "Estádio",
    status: spec.status ?? "encerrada",
    mandante: spec.mandante ?? MEX,
    visitante: spec.visitante ?? RSA,
    golsMandante: spec.golsMandante ?? null,
    golsVisitante: spec.golsVisitante ?? null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
  };
}

describe("derivarClassificacao", () => {
  it("pontua vitória=3, derrota=0 e contabiliza gols/saldo", () => {
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: MEX, visitante: RSA, golsMandante: 2, golsVisitante: 1 }),
    ]);

    const mex = grupoA.linhas.find((l) => l.selecao.id === "mex")!;
    const rsa = grupoA.linhas.find((l) => l.selecao.id === "rsa")!;

    expect(mex.pontos).toBe(3);
    expect(mex.vitorias).toBe(1);
    expect(mex.golsPro).toBe(2);
    expect(mex.golsContra).toBe(1);
    expect(mex.saldoGols).toBe(1);

    expect(rsa.pontos).toBe(0);
    expect(rsa.derrotas).toBe(1);
    expect(rsa.saldoGols).toBe(-1);
  });

  it("pontua empate=1 para os dois lados", () => {
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: MEX, visitante: RSA, golsMandante: 1, golsVisitante: 1 }),
    ]);

    for (const linha of grupoA.linhas) {
      expect(linha.pontos).toBe(1);
      expect(linha.empates).toBe(1);
      expect(linha.saldoGols).toBe(0);
    }
  });

  it("ordena por pontos, depois saldo, depois gols pró", () => {
    // BRA e ARG empatam em pontos (3); BRA tem saldo melhor.
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: BRA, visitante: RSA, golsMandante: 3, golsVisitante: 0 }), // BRA +3
      jogo({ mandante: ARG, visitante: MEX, golsMandante: 1, golsVisitante: 0 }), // ARG +1
    ]);

    expect(grupoA.linhas[0].selecao.id).toBe("bra");
    expect(grupoA.linhas[0].posicao).toBe(1);
    expect(grupoA.linhas[1].selecao.id).toBe("arg");
    expect(grupoA.linhas[1].posicao).toBe(2);
  });

  it("desempata por nome quando pontos, saldo e gols pró são iguais", () => {
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: ARG, visitante: BRA, golsMandante: 1, golsVisitante: 1 }),
    ]);
    // ambos com 1 ponto, saldo 0, 1 gol pró → alfabético: Argentina antes de Brasil
    expect(grupoA.linhas[0].selecao.id).toBe("arg");
    expect(grupoA.linhas[1].selecao.id).toBe("bra");
  });

  it("lista o time mesmo sem jogo encerrado (tudo zerado)", () => {
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: MEX, visitante: RSA, status: "agendada" }),
    ]);

    expect(grupoA.linhas).toHaveLength(2);
    for (const linha of grupoA.linhas) {
      expect(linha.jogos).toBe(0);
      expect(linha.pontos).toBe(0);
    }
    expect(grupoA.finalizado).toBe(false);
  });

  it("ignora jogo ao-vivo (não soma placar parcial)", () => {
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: MEX, visitante: RSA, status: "ao-vivo", golsMandante: 1, golsVisitante: 0 }),
    ]);

    const mex = grupoA.linhas.find((l) => l.selecao.id === "mex")!;
    expect(mex.jogos).toBe(0);
    expect(mex.pontos).toBe(0);
  });

  it("ignora jogo encerrado sem placar apurado (guarda defensiva)", () => {
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: MEX, visitante: RSA, status: "encerrada", golsMandante: null }),
    ]);

    const mex = grupoA.linhas.find((l) => l.selecao.id === "mex")!;
    expect(mex.jogos).toBe(0);
  });

  it("marca finalizado quando todos os jogos do grupo estão encerrados", () => {
    const [grupoA] = derivarClassificacao([
      jogo({ mandante: MEX, visitante: RSA, golsMandante: 0, golsVisitante: 0 }),
      jogo({ mandante: BRA, visitante: ARG, golsMandante: 2, golsVisitante: 1 }),
    ]);
    expect(grupoA.finalizado).toBe(true);
  });

  it("separa grupos e os ordena alfabeticamente; ignora mata-mata", () => {
    const grupos = derivarClassificacao([
      jogo({ grupo: "B", mandante: BRA, visitante: ARG, golsMandante: 1, golsVisitante: 0 }),
      jogo({ grupo: "A", mandante: MEX, visitante: RSA, golsMandante: 1, golsVisitante: 0 }),
      jogo({ grupo: null, fase: "oitavas", golsMandante: 1, golsVisitante: 0 }),
    ]);

    expect(grupos.map((g) => g.grupo)).toEqual(["A", "B"]);
  });
});
