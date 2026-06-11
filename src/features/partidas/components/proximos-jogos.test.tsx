import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

describe("ProximosJogos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    expect(screen.getByText("Os próximos jogos vão aparecer aqui.")).toBeInTheDocument();
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
    mockUsePartidas({
      data: [
        makePartida({
          status: "agendada",
          grupo: "A",
          dataHora: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        }),
      ],
    });
    render(<ProximosJogos />);

    expect(screen.getByText("Grupo A")).toBeInTheDocument();
    expect(screen.getByText("AGENDADO")).toBeInTheDocument();
    expect(screen.getByText("x")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Fazer palpite" });
    expect(link).toHaveAttribute("href", "/palpites");
  });

  it("mostra só os 2 próximos dias com jogo e exclui encerradas", () => {
    mockUsePartidas({
      data: [
        makePartida({
          id: "enc",
          status: "encerrada",
          golsMandante: 2,
          golsVisitante: 1,
          dataHora: "2026-06-10T19:00:00.000Z",
        }),
        makePartida({ id: "d1a", dataHora: "2026-06-11T19:00:00.000Z" }),
        makePartida({ id: "d1b", dataHora: "2026-06-11T22:00:00.000Z" }),
        makePartida({ id: "d2", dataHora: "2026-06-12T19:00:00.000Z" }),
        makePartida({ id: "d3-fora", dataHora: "2026-06-13T19:00:00.000Z" }),
      ],
    });
    render(<ProximosJogos />);

    // Dias 11 (2 jogos) e 12 (1) = 3 cards; dia 13 fica de fora; encerrada excluída.
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.queryByText("2 : 1")).not.toBeInTheDocument();
  });

  it("mostra badge de contagem quando o dia tem 3 ou mais jogos", () => {
    mockUsePartidas({
      data: Array.from({ length: 4 }, (_, index) =>
        makePartida({ id: `g-${index}`, dataHora: "2026-06-11T19:00:00.000Z" })
      ),
    });
    render(<ProximosJogos />);

    expect(screen.getByText("4 jogos")).toBeInTheDocument();
  });

  it("usa o nome da fase quando não há grupo e mostra status 'AO VIVO'", () => {
    mockUsePartidas({
      data: [makePartida({ grupo: null, fase: "final", status: "ao-vivo" })],
    });
    render(<ProximosJogos />);

    expect(screen.getByText("final")).toBeInTheDocument();
    expect(screen.getByText("AO VIVO")).toBeInTheDocument();
  });

  it("exibe rótulo 'HOJE' quando o jogo cai no dia atual em São Paulo", () => {
    vi.useFakeTimers();
    // 2026-06-11T12:00:00Z = 09:00 no fuso America/Sao_Paulo → dia 2026-06-11
    vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
    mockUsePartidas({
      data: [makePartida({ dataHora: "2026-06-11T19:00:00.000Z" })],
    });
    render(<ProximosJogos />);

    expect(screen.getByText(/HOJE/)).toBeInTheDocument();
  });

  it("exibe rótulo 'AMANHÃ' quando o jogo é no dia seguinte ao atual em São Paulo", () => {
    vi.useFakeTimers();
    // 2026-06-10T12:00:00Z = 09:00 SP → hoje=2026-06-10; amanhã=2026-06-11
    vi.setSystemTime(new Date("2026-06-10T12:00:00Z"));
    mockUsePartidas({
      data: [makePartida({ dataHora: "2026-06-11T19:00:00.000Z" })],
    });
    render(<ProximosJogos />);

    expect(screen.getByText(/AMANHÃ/)).toBeInTheDocument();
  });

  it("exclui o próximo jogo em destaque quando excluirProximoDestaque é true", () => {
    vi.useFakeTimers();
    // 2026-06-11T12:00:00Z = 09:00 SP; o jogo das 19:00Z está ~7h à frente (dentro de 24h).
    vi.setSystemTime(new Date("2026-06-11T12:00:00Z"));
    mockUsePartidas({
      data: [
        makePartida({ id: "destaque", dataHora: "2026-06-11T19:00:00.000Z" }),
        makePartida({
          id: "outro",
          dataHora: "2026-06-12T19:00:00.000Z",
          mandante: { id: "a", nome: "Brasil", codigo: "BRA" },
          visitante: { id: "b", nome: "Argentina", codigo: "ARG" },
        }),
      ],
    });
    render(<ProximosJogos excluirProximoDestaque />);

    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.queryByText("México")).not.toBeInTheDocument();
  });

  it("exibe placar quando a partida está ao vivo com gols marcados", () => {
    mockUsePartidas({
      data: [makePartida({ status: "ao-vivo", golsMandante: 2, golsVisitante: 0 })],
    });
    render(<ProximosJogos />);

    expect(screen.getByText("2 : 0")).toBeInTheDocument();
  });
});
