import { describe, it, expect } from "vitest";
import { resolverTrintaEDois, ranquearTerceiros } from "./resolver-trinta-e-dois";
import type { ClassificacaoGrupo, LinhaClassificacao } from "@/features/grupos";

const LETRAS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"] as const;

function fabricaLinha(id: string, nome: string, pontos: number, saldoGols = 0, golsPro = 0): LinhaClassificacao {
  return {
    selecao: { id, nome, codigo: id },
    posicao: 0,
    pontos,
    jogos: 3,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro,
    golsContra: golsPro - saldoGols,
    saldoGols,
  };
}

// Pontos do 3º colocado: A=9, B=8, C=7, D=6, E=5, F=4, G=3, H=2, I=1, J=K=L=0
// → top 8 = ABCDEFGH → atribuirTerceiros slot "1E" = grupo "C" (tabela ABCDEFGH)
function fabricaClassificacao(): ClassificacaoGrupo[] {
  return LETRAS.map((letra, indice) => ({
    grupo: letra,
    finalizado: true,
    jogos: [],
    linhas: [
      fabricaLinha(`${letra}-1`, `Time${letra}1`, 9),
      fabricaLinha(`${letra}-2`, `Time${letra}2`, 6),
      fabricaLinha(`${letra}-3`, `Time${letra}3`, Math.max(0, 9 - indice)),
      fabricaLinha(`${letra}-4`, `Time${letra}4`, 0),
    ],
  }));
}

describe("resolverTrintaEDois", () => {
  it("retorna exatamente 16 confrontos", () => {
    expect(resolverTrintaEDois(fabricaClassificacao())).toHaveLength(16);
  });

  it("2A×2B resolve para o 2º de cada grupo", () => {
    const confrontos = resolverTrintaEDois(fabricaClassificacao());
    const jogo = confrontos.find((c) => c.mandanteLabel === "2A" && c.visitanteLabel === "2B");
    expect(jogo).toBeDefined();
    expect(jogo!.mandanteId).toBe("A-2");
    expect(jogo!.visitanteId).toBe("B-2");
  });

  it("1E×3A/B/C/D/F: mandante = 1º do grupo E, visitante = 3º do grupo alocado ao slot 1E", () => {
    const confrontos = resolverTrintaEDois(fabricaClassificacao());
    const jogo = confrontos.find((c) => c.mandanteLabel === "1E");
    expect(jogo).toBeDefined();
    expect(jogo!.mandanteId).toBe("E-1");
    // slot "1E" com top-8 ABCDEFGH → grupo "C" (tabela ABCDEFGH do melhores-terceiros-2026)
    expect(jogo!.visitanteId).toBe("C-3");
  });

  it("lança erro se algum grupo não estiver finalizado", () => {
    const classificacao = fabricaClassificacao();
    classificacao[0] = { ...classificacao[0], finalizado: false };
    expect(() => resolverTrintaEDois(classificacao)).toThrow(/Grupo A/);
  });

  it("lança erro se algum grupo tiver menos de 3 seleções", () => {
    const classificacao = fabricaClassificacao();
    classificacao[1] = { ...classificacao[1], linhas: classificacao[1].linhas.slice(0, 2) };
    expect(() => resolverTrintaEDois(classificacao)).toThrow(/Grupo B/);
  });
});

describe("ranquearTerceiros", () => {
  it("retorna 8 grupos com melhores 3ºs, na ordem pontos → saldo → golsPro → nome", () => {
    const resultado = ranquearTerceiros(fabricaClassificacao());
    expect(resultado).toHaveLength(8);
    expect(resultado).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  });

  it("desempata por saldoGols, depois por golsPro", () => {
    const classificacao = fabricaClassificacao();
    // empate em pontos entre E(indice 4) e F(indice 5) — ambos com 5pts
    // E terá saldo 0, F terá saldo 1 → F sobe na frente de E
    classificacao[4] = {
      ...classificacao[4],
      linhas: [
        ...classificacao[4].linhas.slice(0, 2),
        fabricaLinha("E-3", "TimeE3", 5, 0, 0),
        classificacao[4].linhas[3],
      ],
    };
    classificacao[5] = {
      ...classificacao[5],
      linhas: [
        ...classificacao[5].linhas.slice(0, 2),
        fabricaLinha("F-3", "TimeF3", 5, 1, 2),
        classificacao[5].linhas[3],
      ],
    };
    const resultado = ranquearTerceiros(classificacao);
    const idxE = resultado.indexOf("E");
    const idxF = resultado.indexOf("F");
    expect(idxF).toBeLessThan(idxE);
  });

  it("ignora grupos não finalizados", () => {
    const classificacao = fabricaClassificacao();
    classificacao[0] = { ...classificacao[0], finalizado: false };
    const resultado = ranquearTerceiros(classificacao);
    expect(resultado).not.toContain("A");
    expect(resultado).toHaveLength(8);
  });
});
