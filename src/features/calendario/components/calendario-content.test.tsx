import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, fakeUser } from "@/test/render";
import type { Partida } from "@/entities/partida";

// usePartidas é mockado para controlar loading/erro/dados sem tocar na rede.
const usePartidasMock = vi.fn();
vi.mock("@/features/partidas", () => ({
  usePartidas: () => usePartidasMock(),
}));

// Import após o mock para garantir que o componente use a versão mockada.
import { CalendarioContent } from "./calendario-content";

interface UsePartidasState {
  data?: Partida[];
  isLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
}

function setUsePartidas(state: UsePartidasState) {
  usePartidasMock.mockReturnValue({
    data: state.data,
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    refetch: state.refetch ?? vi.fn(),
  });
}

// Chave YYYY-MM-DD de hoje no fuso local (mesma lógica do componente).
function pad(valor: number): string {
  return String(valor).padStart(2, "0");
}
function dataHojeLocal(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
}

function makePartidaHoje(): Partida {
  return {
    id: "p-hoje",
    fase: "grupos",
    grupo: "A",
    dataHora: `${dataHojeLocal()}T12:00:00`,
    estadio: "Mexico City",
    status: "agendada",
    mandante: { id: "sel-mex", nome: "México", codigo: "MEX" },
    visitante: { id: "sel-rsa", nome: "África do Sul", codigo: "RSA" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
  };
}

function getDayButtons(): HTMLElement[] {
  const grupo = screen.getByRole("group", { name: "Selecionar dia" });
  return within(grupo).getAllByRole("button");
}

beforeEach(() => {
  usePartidasMock.mockReset();
});

describe("CalendarioContent", () => {
  it("exibe os esqueletos de carregamento durante o loading", () => {
    setUsePartidas({ isLoading: true });
    renderWithProviders(<CalendarioContent />);
    expect(screen.getByLabelText("Carregando jogos")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Selecionar dia" })).not.toBeInTheDocument();
  });

  it("exibe a mensagem de erro e tenta novamente ao clicar no botão", async () => {
    const refetch = vi.fn();
    setUsePartidas({ isError: true, refetch });
    renderWithProviders(<CalendarioContent />);

    expect(
      screen.getByText("Não foi possível carregar a agenda. Tente novamente.")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("renderiza o seletor de semana e os jogos quando há dados", () => {
    setUsePartidas({ data: [makePartidaHoje()] });
    renderWithProviders(<CalendarioContent />);

    expect(screen.getByRole("group", { name: "Selecionar dia" })).toBeInTheDocument();
    expect(screen.getByText("México")).toBeInTheDocument();
  });

  it("não mostra o CTA de palpite para visitante não logado", () => {
    setUsePartidas({ data: [makePartidaHoje()] });
    renderWithProviders(<CalendarioContent />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("mostra o CTA de palpite para usuário logado", () => {
    setUsePartidas({ data: [makePartidaHoje()] });
    renderWithProviders(<CalendarioContent />, { user: fakeUser() });
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("ao selecionar um dia sem jogos, mostra 'Nenhum jogo neste dia.'", async () => {
    setUsePartidas({ data: [makePartidaHoje()] });
    renderWithProviders(<CalendarioContent />);

    // Jogo de hoje aparece inicialmente (nenhum dia selecionado).
    expect(screen.getByText("México")).toBeInTheDocument();

    // Clica num dia da semana que não é hoje (sem aria-current) → sem jogos.
    const diaSemJogos = getDayButtons().find((b) => b.getAttribute("aria-current") !== "date");
    await userEvent.click(diaSemJogos as HTMLElement);

    expect(screen.getByText("Nenhum jogo neste dia.")).toBeInTheDocument();
    expect(screen.queryByText("México")).not.toBeInTheDocument();
  });

  it("clicar de novo no dia já selecionado desfaz a seleção (toggle)", async () => {
    setUsePartidas({ data: [makePartidaHoje()] });
    renderWithProviders(<CalendarioContent />);

    const diaSemJogos = getDayButtons().find(
      (b) => b.getAttribute("aria-current") !== "date"
    ) as HTMLElement;

    // 1º clique: seleciona o dia sem jogos → lista vazia.
    await userEvent.click(diaSemJogos);
    expect(screen.getByText("Nenhum jogo neste dia.")).toBeInTheDocument();

    // 2º clique no mesmo dia: prev === dateKey → desmarca (volta a mostrar tudo).
    await userEvent.click(diaSemJogos);
    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum jogo neste dia.")).not.toBeInTheDocument();
  });

  it("trocar de semana reseta a seleção de dia e desloca a janela", async () => {
    setUsePartidas({ data: [makePartidaHoje()] });
    renderWithProviders(<CalendarioContent />);

    // Seleciona um dia sem jogos para esvaziar a lista.
    const diaSemJogos = getDayButtons().find((b) => b.getAttribute("aria-current") !== "date");
    await userEvent.click(diaSemJogos as HTMLElement);
    expect(screen.getByText("Nenhum jogo neste dia.")).toBeInTheDocument();

    // Avança a semana → seleção é resetada (lista volta a mostrar tudo) e hoje
    // sai da janela visível (nenhum botão com aria-current=date).
    await userEvent.click(screen.getByRole("button", { name: "Próxima semana" }));

    expect(screen.getByText("México")).toBeInTheDocument();
    expect(getDayButtons().some((b) => b.getAttribute("aria-current") === "date")).toBe(false);
  });

  it("voltar para a semana atual reexibe o dia de hoje", async () => {
    setUsePartidas({ data: [makePartidaHoje()] });
    renderWithProviders(<CalendarioContent />);

    await userEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    expect(getDayButtons().some((b) => b.getAttribute("aria-current") === "date")).toBe(false);

    await userEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(getDayButtons().some((b) => b.getAttribute("aria-current") === "date")).toBe(true);
  });
});
