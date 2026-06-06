import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { ItemJogo } from "./item-jogo";

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T16:00:00",
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

describe("ItemJogo", () => {
  it("renderiza os nomes das duas seleções e a badge da fase", () => {
    render(<ItemJogo partida={makePartida()} mostrarCta={false} />);
    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.getByText("África do Sul")).toBeInTheDocument();
    expect(screen.getByText("Gr.A")).toBeInTheDocument();
  });

  it("renderiza as bandeiras das duas seleções", () => {
    render(<ItemJogo partida={makePartida()} mostrarCta={false} />);
    const bandeiras = screen.getAllByRole("img");
    expect(bandeiras).toHaveLength(2);
  });

  it("mostra o horário formatado em partida agendada", () => {
    render(<ItemJogo partida={makePartida({ status: "agendada" })} mostrarCta={false} />);
    expect(screen.getByText("16h00")).toBeInTheDocument();
    expect(screen.queryByText("Ao vivo")).not.toBeInTheDocument();
  });

  it("mostra 'Ao vivo' em vez do horário quando ao vivo", () => {
    render(<ItemJogo partida={makePartida({ status: "ao-vivo" })} mostrarCta={false} />);
    expect(screen.getByText("Ao vivo")).toBeInTheDocument();
    expect(screen.queryByText("16h00")).not.toBeInTheDocument();
  });

  it("mostra o separador × quando não há placar", () => {
    render(
      <ItemJogo
        partida={makePartida({ golsMandante: null, golsVisitante: null })}
        mostrarCta={false}
      />
    );
    expect(screen.getByText("×")).toBeInTheDocument();
  });

  it("mostra o placar quando a partida tem gols", () => {
    render(
      <ItemJogo
        partida={makePartida({ status: "encerrada", golsMandante: 2, golsVisitante: 1 })}
        mostrarCta={false}
      />
    );
    expect(screen.getByText("2 × 1")).toBeInTheDocument();
  });

  it("trata placar 0 a 0 como placar válido (não como separador)", () => {
    render(
      <ItemJogo
        partida={makePartida({ status: "encerrada", golsMandante: 0, golsVisitante: 0 })}
        mostrarCta={false}
      />
    );
    expect(screen.getByText("0 × 0")).toBeInTheDocument();
    expect(screen.queryByText("×")).not.toBeInTheDocument();
  });

  it("aplica opacidade reduzida em partida encerrada", () => {
    const { container } = render(
      <ItemJogo partida={makePartida({ status: "encerrada" })} mostrarCta={false} />
    );
    expect(container.querySelector("li")?.className).toContain("opacity-70");
  });

  it("renderiza confronto indefinido (mata-mata) usando os rótulos", () => {
    const partida = makePartida({
      fase: "oitavas",
      grupo: null,
      mandante: { id: "", nome: "1A", codigo: "1A" },
      visitante: { id: "", nome: "2B", codigo: "2B" },
      mandanteLabel: "1A",
      visitanteLabel: "2B",
    });
    render(<ItemJogo partida={partida} mostrarCta={false} />);
    expect(screen.getByText("1A")).toBeInTheDocument();
    expect(screen.getByText("2B")).toBeInTheDocument();
    expect(screen.getByText("Oitavas")).toBeInTheDocument();
  });

  it("exibe o CTA de palpite em partida agendada quando mostrarCta é true", () => {
    render(<ItemJogo partida={makePartida({ id: "abc" })} mostrarCta />);
    const link = screen.getByRole("link", {
      name: "Dar palpite para México vs África do Sul",
    });
    expect(link).toHaveAttribute("href", "/palpites#abc");
  });

  it("não exibe o CTA quando mostrarCta é false", () => {
    render(<ItemJogo partida={makePartida()} mostrarCta={false} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("não exibe o CTA em partida ao vivo mesmo com mostrarCta true", () => {
    render(<ItemJogo partida={makePartida({ status: "ao-vivo" })} mostrarCta />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("não exibe o CTA em partida encerrada mesmo com mostrarCta true", () => {
    render(<ItemJogo partida={makePartida({ status: "encerrada" })} mostrarCta />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
