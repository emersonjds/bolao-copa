import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { usePartidas } from "../api/queries";
import { ProximosJogos } from "./proximos-jogos";

vi.mock("../api/queries", () => ({ usePartidas: vi.fn() }));

type UsePartidasResult = ReturnType<typeof usePartidas>;

function mockUsePartidas(overrides: Partial<UsePartidasResult>) {
  vi.mocked(usePartidas).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    ...overrides,
  } as UsePartidasResult);
}

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "part-1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T19:00:00.000Z",
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

describe("ProximosJogos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra skeletons enquanto carrega", () => {
    mockUsePartidas({ isLoading: true });
    const { container } = render(<ProximosJogos />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(container.querySelectorAll("li.animate-pulse")).toHaveLength(3);
  });

  it("mostra mensagem de erro quando a query falha", () => {
    mockUsePartidas({ isError: true });
    render(<ProximosJogos />);

    expect(screen.getByText("Não foi possível carregar os jogos.")).toBeInTheDocument();
  });

  it("mostra mensagem de erro quando data é indefinida", () => {
    mockUsePartidas({ data: undefined, isError: false });
    render(<ProximosJogos />);

    expect(screen.getByText("Não foi possível carregar os jogos.")).toBeInTheDocument();
  });

  it("mostra mensagem de vazio quando não há jogos", () => {
    mockUsePartidas({ data: [] });
    render(<ProximosJogos />);

    expect(screen.getByText("Nenhum jogo por aqui ainda.")).toBeInTheDocument();
  });

  it("renderiza um card por partida com as seleções", () => {
    mockUsePartidas({
      data: [makePartida(), makePartida({ id: "part-2", grupo: "B" })],
    });
    render(<ProximosJogos />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByText("México")).toHaveLength(2);
    expect(screen.getAllByText("África do Sul")).toHaveLength(2);
  });

  it("exibe rótulo de grupo e link 'Fazer palpite' em partida agendada", () => {
    mockUsePartidas({ data: [makePartida({ status: "agendada", grupo: "A" })] });
    render(<ProximosJogos />);

    expect(screen.getByText("Grupo A")).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
    expect(screen.getByText("x")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Fazer palpite" });
    expect(link).toHaveAttribute("href", "/palpites");
  });

  it("filtra partidas encerradas e limita a 5 próximos jogos", () => {
    const encerrada = makePartida({
      id: "enc-1",
      status: "encerrada",
      golsMandante: 2,
      golsVisitante: 1,
    });
    const agendadas = Array.from({ length: 6 }, (_, index) =>
      makePartida({ id: `age-${index + 1}`, status: "agendada" }),
    );
    mockUsePartidas({ data: [encerrada, ...agendadas] });
    render(<ProximosJogos />);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.queryByText("2 : 1")).not.toBeInTheDocument();
  });

  it("usa o nome da fase quando não há grupo e mostra status 'Ao vivo'", () => {
    mockUsePartidas({
      data: [makePartida({ grupo: null, fase: "final", status: "ao-vivo" })],
    });
    render(<ProximosJogos />);

    expect(screen.getByText("final")).toBeInTheDocument();
    expect(screen.getByText("Ao vivo")).toBeInTheDocument();
  });
});
