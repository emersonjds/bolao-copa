import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import type { Partida } from "@/entities/partida";
import { usePartidas } from "@/features/partidas";
import { AdminContent } from "./admin-content";

vi.mock("@/features/partidas", () => ({
  usePartidas: vi.fn(),
}));

// Evita qualquer chamada real às mutations quando os cards de edição montam.
vi.mock("../api/mutations", () => ({
  useSalvarResultado: () => ({ mutate: vi.fn(), isPending: false }),
  useDefinirConfronto: () => ({ mutate: vi.fn(), isPending: false }),
}));

type UsePartidasReturn = ReturnType<typeof usePartidas>;

function mockUsePartidas(value: Partial<UsePartidasReturn>) {
  vi.mocked(usePartidas).mockReturnValue(value as UsePartidasReturn);
}

function makePartida(over: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T19:00:00.000Z",
    estadio: "Estádio Azteca",
    status: "agendada",
    mandante: { id: "sel-mex", nome: "México", codigo: "MEX" },
    visitante: { id: "sel-rsa", nome: "África do Sul", codigo: "RSA" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminContent — estados de carregamento", () => {
  it("mostra o skeleton enquanto carrega", () => {
    mockUsePartidas({ isLoading: true, isError: false, data: undefined });
    const { container } = renderWithProviders(<AdminContent />);

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByText("Painel admin")).toBeInTheDocument();
  });

  it("mostra mensagem de erro e permite tentar novamente", async () => {
    const refetch = vi.fn();
    mockUsePartidas({ isLoading: false, isError: true, refetch });
    renderWithProviders(<AdminContent />);

    expect(screen.getByText(/não foi possível carregar as partidas/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});

describe("AdminContent — lista e filtro de status", () => {
  it("lista por padrão apenas partidas pendentes (agendada/ao-vivo)", () => {
    mockUsePartidas({
      isLoading: false,
      isError: false,
      data: [
        makePartida({ id: "a", status: "agendada" }),
        makePartida({
          id: "b",
          status: "encerrada",
          golsMandante: 1,
          golsVisitante: 0,
          mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
          visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
        }),
      ],
    });
    renderWithProviders(<AdminContent />);

    // A pendente aparece (input de gols visível); a encerrada não está na aba.
    expect(screen.getByLabelText("Gols de México")).toBeInTheDocument();
    expect(screen.queryByText(/Brasil 1 × 0 Argentina/)).not.toBeInTheDocument();
  });

  it("alterna para encerradas ao clicar na aba correspondente", async () => {
    mockUsePartidas({
      isLoading: false,
      isError: false,
      data: [
        makePartida({ id: "a", status: "agendada" }),
        makePartida({
          id: "b",
          status: "encerrada",
          golsMandante: 1,
          golsVisitante: 0,
          mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
          visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
        }),
      ],
    });
    renderWithProviders(<AdminContent />);

    await userEvent.click(screen.getByRole("tab", { name: "Encerradas" }));

    expect(screen.getByText(/Brasil 1 × 0 Argentina/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Gols de México")).not.toBeInTheDocument();
  });

  it("mostra estado vazio adequado para cada aba", async () => {
    mockUsePartidas({ isLoading: false, isError: false, data: [] });
    renderWithProviders(<AdminContent />);

    expect(screen.getByText("Nenhuma partida pendente.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Encerradas" }));
    expect(screen.getByText("Nenhuma partida encerrada.")).toBeInTheDocument();
  });
});

describe("AdminContent — filtro de fase", () => {
  it("filtra as partidas pendentes pela fase selecionada", async () => {
    mockUsePartidas({
      isLoading: false,
      isError: false,
      data: [
        makePartida({ id: "g", fase: "grupos", grupo: "A" }),
        makePartida({
          id: "o",
          fase: "oitavas",
          grupo: null,
          mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
          visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
        }),
      ],
    });
    renderWithProviders(<AdminContent />);

    // Com duas fases, o filtro de fase aparece.
    const chipOitavas = screen.getByRole("button", { name: "Oitavas" });
    await userEvent.click(chipOitavas);

    // Só a partida de oitavas (Brasil) permanece.
    expect(screen.getByLabelText("Gols de Brasil")).toBeInTheDocument();
    expect(screen.queryByLabelText("Gols de México")).not.toBeInTheDocument();
  });

  it("reverte filtroFaseEfetivo para 'todas' quando a fase selecionada sai das disponíveis", async () => {
    // Começa com grupos e oitavas.
    mockUsePartidas({
      isLoading: false,
      isError: false,
      data: [
        makePartida({ id: "g", fase: "grupos", grupo: "A" }),
        makePartida({
          id: "o",
          fase: "oitavas",
          grupo: null,
          mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
          visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
        }),
      ],
    });
    const { rerender } = renderWithProviders(<AdminContent />);

    // Seleciona o chip de Oitavas → filtroFase = "oitavas".
    await userEvent.click(screen.getByRole("button", { name: "Oitavas" }));
    expect(screen.getByLabelText("Gols de Brasil")).toBeInTheDocument();

    // Agora os dados mudam: apenas a partida de grupos existe.
    // "oitavas" some de fasesDisponiveis → filtroFaseEfetivo cai para "todas".
    mockUsePartidas({
      isLoading: false,
      isError: false,
      data: [makePartida({ id: "g", fase: "grupos", grupo: "A" })],
    });
    rerender(<AdminContent />);

    // Com filtroFaseEfetivo = "todas", a partida de grupos (México) aparece.
    expect(screen.getByLabelText("Gols de México")).toBeInTheDocument();
  });
});
