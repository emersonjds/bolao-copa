import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardConfronto } from "./card-confronto";
import type { ConfrontoBracket, LadoConfronto } from "../lib/derivar-bracket";

const bra = { id: "bra", nome: "Brasil", codigo: "BRA" };
const arg = { id: "arg", nome: "Argentina", codigo: "ARG" };

function makeLado(overrides: Partial<LadoConfronto> = {}): LadoConfronto {
  return {
    selecao: null,
    placeholder: "Vencedor 73",
    gols: null,
    vencedor: false,
    ...overrides,
  };
}

function makeConfronto(overrides: Partial<ConfrontoBracket> = {}): ConfrontoBracket {
  return {
    numero: 89,
    fase: "oitavas",
    status: "agendada",
    mandante: makeLado(),
    visitante: makeLado({ placeholder: "Vencedor 74" }),
    ...overrides,
  };
}

describe("CardConfronto", () => {
  it("mostra placeholder quando selecao é null", () => {
    render(<CardConfronto confronto={makeConfronto()} />);
    expect(screen.getByText("Vencedor 73")).toBeInTheDocument();
    expect(screen.getByText("Vencedor 74")).toBeInTheDocument();
  });

  it("mostra nome e FlagIcon quando seleção está resolvida", () => {
    render(
      <CardConfronto
        confronto={makeConfronto({
          mandante: makeLado({ selecao: bra, placeholder: "Brasil" }),
          visitante: makeLado({ selecao: arg, placeholder: "Argentina" }),
        })}
      />
    );
    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.getByText("Argentina")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Brasil" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Argentina" })).toBeInTheDocument();
  });

  it("exibe placar quando status é encerrada", () => {
    render(
      <CardConfronto
        confronto={makeConfronto({
          status: "encerrada",
          mandante: makeLado({ selecao: bra, placeholder: "Brasil", gols: 2, vencedor: true }),
          visitante: makeLado({ selecao: arg, placeholder: "Argentina", gols: 1 }),
        })}
      />
    );
    expect(screen.getByLabelText("2 gols")).toBeInTheDocument();
    expect(screen.getByLabelText("1 gols")).toBeInTheDocument();
  });

  it("oculta placar quando status não é encerrada", () => {
    render(
      <CardConfronto
        confronto={makeConfronto({
          mandante: makeLado({ gols: 2 }),
          visitante: makeLado({ gols: 1 }),
        })}
      />
    );
    expect(screen.queryByLabelText("2 gols")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("1 gols")).not.toBeInTheDocument();
  });

  it("aplica estilo brand no nome do lado vencedor", () => {
    render(
      <CardConfronto
        confronto={makeConfronto({
          status: "encerrada",
          mandante: makeLado({ selecao: bra, placeholder: "Brasil", gols: 2, vencedor: true }),
          visitante: makeLado({ selecao: arg, placeholder: "Argentina", gols: 1 }),
        })}
      />
    );
    expect(screen.getByText("Brasil")).toHaveClass("text-brand-700");
    expect(screen.getByText("Argentina")).not.toHaveClass("text-brand-700");
  });
});
