import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MinhaPosicaoBanner } from "./minha-posicao-banner";
import type { ItemRanking } from "@/entities/ranking";

const itemBase: ItemRanking = {
  participanteId: "meu-id",
  nome: "João Silva",
  avatarUrl: null,
  pontosTotais: 10,
  jogosPontuados: 3,
};

describe("MinhaPosicaoBanner", () => {
  it("renderiza o container com role region e aria-label com a posição", () => {
    render(<MinhaPosicaoBanner item={itemBase} posicao={5} />);

    expect(
      screen.getByRole("region", { name: "Sua posição no ranking: 5º lugar" })
    ).toBeInTheDocument();
  });

  it("exibe o texto 'Você' como nome do usuário logado", () => {
    render(<MinhaPosicaoBanner item={itemBase} posicao={4} />);

    expect(screen.getByText("Você")).toBeInTheDocument();
  });

  it("exibe o badge 'Sua posição'", () => {
    render(<MinhaPosicaoBanner item={itemBase} posicao={4} />);

    expect(screen.getByText("Sua posição")).toBeInTheDocument();
  });

  it("exibe o número ordinal da posição no elemento visual (aria-hidden)", () => {
    render(<MinhaPosicaoBanner item={itemBase} posicao={7} />);

    // O span com aria-hidden contém o ordinal — getByText encontra mesmo em aria-hidden
    expect(screen.getByText("7º")).toBeInTheDocument();
  });

  it("exibe 'ponto' no singular para 1 ponto total", () => {
    render(<MinhaPosicaoBanner item={{ ...itemBase, pontosTotais: 1 }} posicao={4} />);

    expect(screen.getByText(/1 ponto/)).toBeInTheDocument();
  });

  it("exibe 'pontos' no plural para múltiplos pontos totais", () => {
    render(<MinhaPosicaoBanner item={{ ...itemBase, pontosTotais: 12 }} posicao={4} />);

    expect(screen.getByText(/12 pontos/)).toBeInTheDocument();
  });

  it("exibe 'jogo pontuado' no singular para 1 jogo", () => {
    render(<MinhaPosicaoBanner item={{ ...itemBase, jogosPontuados: 1 }} posicao={4} />);

    expect(screen.getByText(/1 jogo pontuado/)).toBeInTheDocument();
  });

  it("exibe 'jogos pontuados' no plural para múltiplos jogos", () => {
    render(<MinhaPosicaoBanner item={{ ...itemBase, jogosPontuados: 7 }} posicao={4} />);

    expect(screen.getByText(/7 jogos pontuados/)).toBeInTheDocument();
  });

  it("a linha de pontos e jogos aparece concatenada com separador '·'", () => {
    render(
      <MinhaPosicaoBanner item={{ ...itemBase, pontosTotais: 5, jogosPontuados: 2 }} posicao={4} />
    );

    // O parágrafo contém ambos os valores na mesma linha
    const paragrafo = screen.getByText(/5 pontos/);
    expect(paragrafo).toHaveTextContent("2 jogos pontuados");
    expect(paragrafo.textContent).toContain("·");
  });

  it("reflete corretamente posições diferentes no aria-label", () => {
    const { rerender } = render(<MinhaPosicaoBanner item={itemBase} posicao={4} />);
    expect(
      screen.getByRole("region", { name: "Sua posição no ranking: 4º lugar" })
    ).toBeInTheDocument();

    rerender(<MinhaPosicaoBanner item={itemBase} posicao={10} />);
    expect(
      screen.getByRole("region", { name: "Sua posição no ranking: 10º lugar" })
    ).toBeInTheDocument();
  });
});
