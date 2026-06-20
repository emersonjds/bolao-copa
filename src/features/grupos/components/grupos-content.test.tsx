import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Partida } from "@/entities/partida";
import { usePartidas } from "@/features/partidas";
import { GruposContent } from "./grupos-content";

vi.mock("@/features/partidas", () => ({ usePartidas: vi.fn() }));

type UsePartidasResult = ReturnType<typeof usePartidas>;

function mockPartidas(overrides: Partial<UsePartidasResult>) {
  vi.mocked(usePartidas).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  } as UsePartidasResult);
}

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-12T19:00:00.000Z",
    janelaInicio: "2026-06-12T03:00:00.000Z",
    estadio: "Estádio",
    status: "encerrada",
    mandante: { id: "bra", nome: "Brasil", codigo: "BRA" },
    visitante: { id: "arg", nome: "Argentina", codigo: "ARG" },
    golsMandante: 2,
    golsVisitante: 1,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...overrides,
  };
}

describe("GruposContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe skeleton enquanto carrega", () => {
    mockPartidas({ isLoading: true });
    const { container } = render(<GruposContent />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("exibe mensagem de erro e botão de retry quando falha", () => {
    const refetch = vi.fn();
    mockPartidas({ isError: true, refetch: refetch as unknown as UsePartidasResult["refetch"] });
    render(<GruposContent />);
    expect(screen.getByText(/Não foi possível carregar os grupos/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("chama refetch ao clicar em 'Tentar novamente'", async () => {
    const refetch = vi.fn();
    mockPartidas({ isError: true, refetch: refetch as unknown as UsePartidasResult["refetch"] });
    render(<GruposContent />);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("exibe mensagem de grupos indisponíveis quando não há dados de grupos", () => {
    mockPartidas({ data: [] });
    render(<GruposContent />);
    expect(screen.getByText("Grupos ainda não disponíveis")).toBeInTheDocument();
    expect(screen.getByText(/A tabela aparece assim que/)).toBeInTheDocument();
  });

  it("exibe mensagem de grupos indisponíveis quando partidas não são da fase grupos", () => {
    mockPartidas({
      data: [makePartida({ fase: "oitavas", grupo: null })],
    });
    render(<GruposContent />);
    expect(screen.getByText("Grupos ainda não disponíveis")).toBeInTheDocument();
  });

  it("renderiza as abas de grupo e a tabela ao ter dados", () => {
    mockPartidas({
      data: [
        makePartida({ id: "p1", grupo: "A" }),
        makePartida({
          id: "p2",
          grupo: "B",
          mandante: { id: "mex", nome: "México", codigo: "MEX" },
          visitante: { id: "rsa", nome: "África do Sul", codigo: "RSA" },
        }),
      ],
    });
    render(<GruposContent />);

    const tablist = screen.getByRole("tablist", { name: "Selecionar grupo" });
    expect(tablist).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Grupo A" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Grupo B" })).toBeInTheDocument();
  });

  it("seleciona o primeiro grupo por padrão (aria-selected)", () => {
    mockPartidas({
      data: [makePartida({ id: "p1", grupo: "A" }), makePartida({ id: "p2", grupo: "B" })],
    });
    render(<GruposContent />);

    const tabA = screen.getByRole("tab", { name: "Grupo A" });
    const tabB = screen.getByRole("tab", { name: "Grupo B" });

    expect(tabA).toHaveAttribute("aria-selected", "true");
    expect(tabB).toHaveAttribute("aria-selected", "false");
  });

  it("troca o grupo ativo ao clicar em outra aba", async () => {
    mockPartidas({
      data: [makePartida({ id: "p1", grupo: "A" }), makePartida({ id: "p2", grupo: "B" })],
    });
    render(<GruposContent />);

    await userEvent.click(screen.getByRole("tab", { name: "Grupo B" }));

    expect(screen.getByRole("tab", { name: "Grupo B" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Grupo A" })).toHaveAttribute("aria-selected", "false");
  });

  it("exibe a caption acessível da tabela do grupo ativo", () => {
    mockPartidas({
      data: [makePartida({ id: "p1", grupo: "C" })],
    });
    render(<GruposContent />);
    expect(screen.getByText("Classificação do grupo C")).toBeInTheDocument();
  });
});
