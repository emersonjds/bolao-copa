import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { ListaPalpites } from "./lista-palpites";

vi.mock("@/shared/ui/flag-icon", () => ({
  FlagIcon: ({ nome }: { nome: string }) => <span data-testid="bandeira">{nome}</span>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function criarPartida(id: string, dataHora: string): Partida {
  return {
    id,
    fase: "grupos",
    grupo: "A",
    dataHora,
    estadio: "Estadio X",
    status: "agendada",
    mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
    visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
  };
}

const defaultProps = {
  meusPalpites: [],
  placaresLocais: {},
  onChangePlacar: vi.fn(),
  isSaving: false,
};

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("ListaPalpites", () => {
  it("exibe mensagem de nenhum jogo quando a lista está vazia", () => {
    render(<ListaPalpites {...defaultProps} partidas={[]} />);

    expect(screen.getByText(/nenhum jogo nesta fase por enquanto/i)).toBeInTheDocument();
  });

  it("renderiza o card de cada partida e agrupa por data UTC", () => {
    const partidas = [
      criarPartida("part-1", "2026-06-11T19:00:00.000Z"),
      criarPartida("part-2", "2026-06-11T22:00:00.000Z"), // mesma data
    ];

    render(<ListaPalpites {...defaultProps} partidas={partidas} />);

    // Um único cabeçalho de grupo para 2026-06-11
    const cabecalhos = screen.getAllByText(/rodada 1/i);
    expect(cabecalhos).toHaveLength(1);

    // Dois cards (inputs do mandante/visitante por card)
    const inputs = screen.getAllByRole("spinbutton");
    // 2 cards × 2 inputs = 4
    expect(inputs).toHaveLength(4);
  });

  it("cria seções separadas para datas diferentes com cabeçalhos de rodada corretos", () => {
    const partidas = [
      criarPartida("part-1", "2026-06-11T19:00:00.000Z"),
      criarPartida("part-2", "2026-06-12T22:00:00.000Z"),
    ];

    render(<ListaPalpites {...defaultProps} partidas={partidas} />);

    expect(screen.getByText(/rodada 1/i)).toBeInTheDocument();
    expect(screen.getByText(/rodada 2/i)).toBeInTheDocument();
  });
});
