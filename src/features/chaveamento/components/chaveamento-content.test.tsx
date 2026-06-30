import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { ChaveamentoContent } from "./chaveamento-content";
import type { RodadaBracket } from "../lib/derivar-bracket";

vi.mock("../api/bracket-fetcher", () => ({
  buscarPartidasMataMata: vi.fn(),
}));

vi.mock("../lib/derivar-bracket", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/derivar-bracket")>();
  return { ...original, derivarBracket: vi.fn() };
});

import { buscarPartidasMataMata } from "../api/bracket-fetcher";
import { derivarBracket } from "../lib/derivar-bracket";

const rodadaFinal: RodadaBracket = {
  fase: "final",
  titulo: "Final",
  confrontos: [
    {
      numero: 104,
      fase: "final",
      status: "agendada",
      mandante: { selecao: null, placeholder: "Vencedor 101", gols: null, vencedor: false },
      visitante: { selecao: null, placeholder: "Vencedor 102", gols: null, vencedor: false },
    },
  ],
};

describe("ChaveamentoContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exibe estado de carregamento enquanto busca partidas", () => {
    vi.mocked(buscarPartidasMataMata).mockReturnValue(new Promise(() => {}));
    vi.mocked(derivarBracket).mockReturnValue([]);

    renderWithProviders(<ChaveamentoContent />);

    expect(screen.getByText("Carregando chaveamento…")).toBeInTheDocument();
  });

  it("exibe mensagem de erro quando a busca falha", async () => {
    vi.mocked(buscarPartidasMataMata).mockRejectedValue(new Error("network error"));
    vi.mocked(derivarBracket).mockReturnValue([]);

    renderWithProviders(<ChaveamentoContent />);

    await waitFor(() => {
      expect(
        screen.getByText(/Não foi possível carregar o chaveamento/i)
      ).toBeInTheDocument();
    });
  });

  it("exibe mensagem de vazio quando não há rodadas", async () => {
    vi.mocked(buscarPartidasMataMata).mockResolvedValue([]);
    vi.mocked(derivarBracket).mockReturnValue([]);

    renderWithProviders(<ChaveamentoContent />);

    await waitFor(() => {
      expect(screen.getByText("O chaveamento ainda não foi definido.")).toBeInTheDocument();
    });
  });

  it("renderiza rodadas com confrontos quando há dados", async () => {
    vi.mocked(buscarPartidasMataMata).mockResolvedValue([]);
    vi.mocked(derivarBracket).mockReturnValue([rodadaFinal]);

    renderWithProviders(<ChaveamentoContent />);

    await waitFor(() => {
      expect(screen.getByText("Final")).toBeInTheDocument();
      expect(screen.getByText("Vencedor 101")).toBeInTheDocument();
      expect(screen.getByText("Vencedor 102")).toBeInTheDocument();
    });
  });

  it("exibe controles de zoom", async () => {
    vi.mocked(buscarPartidasMataMata).mockResolvedValue([]);
    vi.mocked(derivarBracket).mockReturnValue([rodadaFinal]);

    renderWithProviders(<ChaveamentoContent />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Diminuir zoom" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Aumentar zoom" })).toBeInTheDocument();
      expect(screen.getByText("100%")).toBeInTheDocument();
    });
  });
});
