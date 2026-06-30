import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Selecao } from "@/entities/partida";
import type { ClassificacaoGrupo, LinhaClassificacao } from "../lib/derivar-classificacao";
import { TabelaGrupo } from "./tabela-grupo";

function selecao(id: string, nome: string, codigo: string): Selecao {
  return { id, nome, codigo };
}

function linha(overrides: Partial<LinhaClassificacao> & { selecao: Selecao }): LinhaClassificacao {
  return {
    posicao: 1,
    pontos: 0,
    jogos: 0,
    vitorias: 0,
    empates: 0,
    derrotas: 0,
    golsPro: 0,
    golsContra: 0,
    saldoGols: 0,
    ...overrides,
  };
}

function classificacao(overrides?: Partial<ClassificacaoGrupo>): ClassificacaoGrupo {
  return {
    grupo: "A",
    finalizado: false,
    jogos: [],
    linhas: [],
    ...overrides,
  };
}

const BRA = selecao("bra", "Brasil", "BRA");
const ARG = selecao("arg", "Argentina", "ARG");
const MEX = selecao("mex", "México", "MEX");
const RSA = selecao("rsa", "África do Sul", "RSA");

describe("TabelaGrupo", () => {
  it("renderiza o caption acessível com a letra do grupo", () => {
    render(<TabelaGrupo classificacao={classificacao()} />);
    expect(screen.getByText("Classificação do grupo A")).toBeInTheDocument();
  });

  it("exibe os cabeçalhos de coluna", () => {
    render(<TabelaGrupo classificacao={classificacao()} />);
    expect(screen.getByTitle("Jogos")).toBeInTheDocument();
    expect(screen.getByTitle("Pontos")).toBeInTheDocument();
    expect(screen.getByTitle("Saldo de gols")).toBeInTheDocument();
    expect(screen.getByTitle("Vitórias")).toBeInTheDocument();
    expect(screen.getByTitle("Empates")).toBeInTheDocument();
    expect(screen.getByTitle("Derrotas")).toBeInTheDocument();
    expect(screen.getByTitle("Gols pró")).toBeInTheDocument();
    expect(screen.getByTitle("Gols contra")).toBeInTheDocument();
  });

  it("renderiza uma linha por seleção com posição e pontos", () => {
    const classi = classificacao({
      linhas: [
        linha({ selecao: BRA, posicao: 1, pontos: 9 }),
        linha({ selecao: ARG, posicao: 2, pontos: 6 }),
        linha({ selecao: MEX, posicao: 3, pontos: 7 }),
        linha({ selecao: RSA, posicao: 4, pontos: 5 }),
      ],
    });

    render(<TabelaGrupo classificacao={classi} />);
    // header row + 4 body rows
    expect(screen.getAllByRole("row")).toHaveLength(5);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  describe("formatação do saldo de gols", () => {
    it("exibe sinal positivo para saldo > 0", () => {
      render(
        <TabelaGrupo
          classificacao={classificacao({ linhas: [linha({ selecao: BRA, saldoGols: 4 })] })}
        />
      );
      expect(screen.getByText("+4")).toBeInTheDocument();
    });

    it("não exibe sinal positivo para saldo = 0", () => {
      render(
        <TabelaGrupo
          classificacao={classificacao({ linhas: [linha({ selecao: BRA, saldoGols: 0 })] })}
        />
      );
      // saldo 0 não deve receber prefixo "+"
      expect(screen.queryByText("+0")).not.toBeInTheDocument();
      expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    });

    it("exibe saldo negativo sem transformação", () => {
      render(
        <TabelaGrupo
          classificacao={classificacao({ linhas: [linha({ selecao: RSA, saldoGols: -5 })] })}
        />
      );
      expect(screen.getByText("-5")).toBeInTheDocument();
    });
  });

  describe("badges sr-only quando grupo finalizado", () => {
    it("exibe 'Classificado' para posições 1 e 2", () => {
      render(
        <TabelaGrupo
          classificacao={classificacao({
            finalizado: true,
            linhas: [linha({ selecao: BRA, posicao: 1 }), linha({ selecao: ARG, posicao: 2 })],
          })}
        />
      );
      expect(screen.getAllByText("Classificado")).toHaveLength(2);
    });

    it("exibe 'Repescagem' para posição 3", () => {
      render(
        <TabelaGrupo
          classificacao={classificacao({
            finalizado: true,
            linhas: [linha({ selecao: MEX, posicao: 3 })],
          })}
        />
      );
      expect(screen.getByText("Repescagem")).toBeInTheDocument();
    });

    it("não exibe badge para posição 4 (eliminado) mesmo finalizado", () => {
      render(
        <TabelaGrupo
          classificacao={classificacao({
            finalizado: true,
            linhas: [linha({ selecao: RSA, posicao: 4 })],
          })}
        />
      );
      expect(screen.queryByText("Classificado")).not.toBeInTheDocument();
      expect(screen.queryByText("Repescagem")).not.toBeInTheDocument();
    });
  });

  describe("sem badges enquanto grupo não finalizado", () => {
    it("não exibe badge para posição 1 (provisório)", () => {
      render(
        <TabelaGrupo
          classificacao={classificacao({
            finalizado: false,
            linhas: [
              linha({ selecao: BRA, posicao: 1 }),
              linha({ selecao: ARG, posicao: 2 }),
              linha({ selecao: MEX, posicao: 3 }),
              linha({ selecao: RSA, posicao: 4 }),
            ],
          })}
        />
      );
      expect(screen.queryByText("Classificado")).not.toBeInTheDocument();
      expect(screen.queryByText("Repescagem")).not.toBeInTheDocument();
    });
  });
});
