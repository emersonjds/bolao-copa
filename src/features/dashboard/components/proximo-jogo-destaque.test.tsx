import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { usePartidas } from "@/features/partidas";
import { ProximoJogoDestaque } from "./proximo-jogo-destaque";

vi.mock("@/features/partidas", () => ({ usePartidas: vi.fn() }));

type UsePartidasResult = ReturnType<typeof usePartidas>;

const HORA = 60 * 60 * 1000;

function mockUsePartidas(overrides: Partial<UsePartidasResult>) {
  vi.mocked(usePartidas).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as UsePartidasResult);
}

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "part-1",
    fase: "grupos",
    grupo: "A",
    dataHora: new Date(Date.now() + 2 * HORA).toISOString(),
    janelaInicio: "2020-01-01T03:00:00Z",
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

describe("ProximoJogoDestaque", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra skeleton enquanto carrega", () => {
    mockUsePartidas({ isLoading: true });
    const { container } = render(<ProximoJogoDestaque />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("não renderiza nada quando data é indefinida", () => {
    mockUsePartidas({ data: undefined });
    const { container } = render(<ProximoJogoDestaque />);

    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada quando não há jogo nas próximas 24h", () => {
    mockUsePartidas({
      data: [makePartida({ dataHora: new Date(Date.now() + 48 * HORA).toISOString() })],
    });
    const { container } = render(<ProximoJogoDestaque />);

    expect(container).toBeEmptyDOMElement();
  });

  it("ignora jogos não agendados e os já passados", () => {
    mockUsePartidas({
      data: [
        makePartida({ id: "ao-vivo", status: "ao-vivo" }),
        makePartida({
          id: "passado",
          dataHora: new Date(Date.now() - 2 * HORA).toISOString(),
        }),
      ],
    });
    const { container } = render(<ProximoJogoDestaque />);

    expect(container).toBeEmptyDOMElement();
  });

  it("destaca o jogo agendado dentro das próximas 24h", () => {
    mockUsePartidas({ data: [makePartida()] });
    render(<ProximoJogoDestaque />);

    expect(
      screen.getByRole("region", { name: "Próximo jogo: México contra África do Sul" })
    ).toBeInTheDocument();
    expect(screen.getByText("Grupo A")).toBeInTheDocument();
    expect(screen.getByText("Em breve")).toBeInTheDocument();
    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.getByText("África do Sul")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fazer palpite" })).toHaveAttribute("href", "/palpites");
  });

  it("escolhe o jogo mais próximo entre vários candidatos", () => {
    mockUsePartidas({
      data: [
        makePartida({
          id: "mais-tarde",
          dataHora: new Date(Date.now() + 5 * HORA).toISOString(),
          mandante: { id: "a", nome: "Brasil", codigo: "BRA" },
          visitante: { id: "b", nome: "Argentina", codigo: "ARG" },
        }),
        makePartida({
          id: "mais-cedo",
          dataHora: new Date(Date.now() + 1 * HORA).toISOString(),
        }),
      ],
    });
    render(<ProximoJogoDestaque />);

    expect(
      screen.getByRole("region", { name: "Próximo jogo: México contra África do Sul" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Brasil")).not.toBeInTheDocument();
  });

  it("usa o nome da fase quando não há grupo", () => {
    mockUsePartidas({
      data: [makePartida({ grupo: null, fase: "oitavas" })],
    });
    render(<ProximoJogoDestaque />);

    expect(screen.getByText("Oitavas de Final")).toBeInTheDocument();
  });
});
