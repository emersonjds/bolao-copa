import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { getSession } = vi.hoisted(() => ({
  getSession: vi.fn<() => Promise<{ data: { session: { user: { id: string } } | null } }>>(),
}));
vi.mock("@/shared/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: { getSession } }),
}));

const { avisoFoiVisto, marcarAvisoVisto } = vi.hoisted(() => ({
  avisoFoiVisto: vi.fn<(userId: string, avisoId: string) => Promise<boolean>>(),
  marcarAvisoVisto: vi.fn<(userId: string, avisoId: string) => Promise<void>>(),
}));
vi.mock("../api/avisos-fetcher", () => ({ avisoFoiVisto, marcarAvisoVisto }));

const { avisoVistoLocal, marcarAvisoVistoLocal } = vi.hoisted(() => ({
  avisoVistoLocal: vi.fn<(avisoId: string) => boolean>(),
  marcarAvisoVistoLocal: vi.fn<(avisoId: string) => void>(),
}));
vi.mock("../lib/aviso-local", () => ({ avisoVistoLocal, marcarAvisoVistoLocal }));

const { mataMataDefinido } = vi.hoisted(() => ({
  mataMataDefinido: vi.fn<() => Promise<boolean>>(),
}));
vi.mock("../api/fase-pronta", () => ({ mataMataDefinido }));

import { NovidadesGate } from "./novidades-gate";

function semSessao() {
  return { data: { session: null } };
}

function comSessao(id = "user-1") {
  return { data: { session: { user: { id } } } };
}

describe("NovidadesGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    marcarAvisoVisto.mockResolvedValue(undefined);
    marcarAvisoVistoLocal.mockReturnValue(undefined);
    mataMataDefinido.mockResolvedValue(true);
  });

  describe("usuário logado", () => {
    it("exibe o modal quando o aviso não foi visto", async () => {
      getSession.mockResolvedValue(comSessao());
      avisoFoiVisto.mockResolvedValue(false);

      render(<NovidadesGate />);

      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    });

    it("não exibe o modal quando o aviso já foi visto", async () => {
      getSession.mockResolvedValue(comSessao());
      avisoFoiVisto.mockResolvedValue(true);

      render(<NovidadesGate />);

      await waitFor(() => expect(avisoFoiVisto).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("não exibe o modal quando avisoFoiVisto lança (falha silenciosa)", async () => {
      getSession.mockResolvedValue(comSessao());
      avisoFoiVisto.mockRejectedValue(new Error("rede fora"));

      render(<NovidadesGate />);

      await waitFor(() => expect(avisoFoiVisto).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("fecha o modal e marca como visto ao clicar em Bora!", async () => {
      getSession.mockResolvedValue(comSessao());
      // primeira chamada: novidades não visto → abre; segunda: mata-mata visto → fila vazia
      avisoFoiVisto.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      render(<NovidadesGate />);
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

      await userEvent.click(screen.getByRole("button", { name: /bora!/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(marcarAvisoVisto).toHaveBeenCalledWith("user-1", "novidades-2026-06");
    });

    it("fecha o modal mesmo quando marcarAvisoVisto lança (falha silenciosa)", async () => {
      getSession.mockResolvedValue(comSessao());
      avisoFoiVisto.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      marcarAvisoVisto.mockRejectedValue(new Error("falha ao marcar"));

      render(<NovidadesGate />);
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

      await userEvent.click(screen.getByRole("button", { name: /bora!/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("usuário anônimo", () => {
    it("exibe o modal quando o aviso não foi visto localmente", async () => {
      getSession.mockResolvedValue(semSessao());
      avisoVistoLocal.mockReturnValue(false);

      render(<NovidadesGate />);

      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    });

    it("não exibe o modal quando o aviso já foi visto localmente", async () => {
      getSession.mockResolvedValue(semSessao());
      avisoVistoLocal.mockReturnValue(true);

      render(<NovidadesGate />);

      await waitFor(() => expect(avisoVistoLocal).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("fecha o modal e marca como visto no localStorage ao clicar em Bora!", async () => {
      getSession.mockResolvedValue(semSessao());
      // novidades não visto → abre; após fechar, mata-mata visto → fila vazia
      avisoVistoLocal.mockReturnValueOnce(false).mockReturnValueOnce(true);

      render(<NovidadesGate />);
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

      await userEvent.click(screen.getByRole("button", { name: /bora!/i }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(marcarAvisoVistoLocal).toHaveBeenCalledWith("novidades-2026-06");
      expect(marcarAvisoVisto).not.toHaveBeenCalled();
    });
  });

  describe("fila de avisos", () => {
    describe("usuário logado", () => {
      it("pula o primeiro aviso se já visto e mostra o segundo", async () => {
        getSession.mockResolvedValue(comSessao());
        avisoFoiVisto
          .mockResolvedValueOnce(true) // novidades: visto
          .mockResolvedValueOnce(false); // mata-mata: não visto

        render(<NovidadesGate />);

        await waitFor(() =>
          expect(screen.getByText("Começou o mata-mata!")).toBeInTheDocument(),
        );
      });

      it("não renderiza nada quando todos os avisos foram vistos", async () => {
        getSession.mockResolvedValue(comSessao());
        avisoFoiVisto.mockResolvedValue(true);

        render(<NovidadesGate />);

        await waitFor(() => expect(avisoFoiVisto).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      it("após fechar o primeiro, exibe o segundo aviso", async () => {
        getSession.mockResolvedValue(comSessao());
        avisoFoiVisto.mockResolvedValue(false);

        render(<NovidadesGate />);
        await waitFor(() =>
          expect(screen.getByText("Novidades no bolão")).toBeInTheDocument(),
        );

        await userEvent.click(screen.getByRole("button", { name: /bora!/i }));

        await waitFor(() =>
          expect(screen.getByText("Começou o mata-mata!")).toBeInTheDocument(),
        );
      });
    });

    describe("usuário anônimo", () => {
      it("pula o primeiro aviso se já visto localmente e mostra o segundo", async () => {
        getSession.mockResolvedValue(semSessao());
        avisoVistoLocal
          .mockReturnValueOnce(true) // novidades: visto
          .mockReturnValueOnce(false); // mata-mata: não visto

        render(<NovidadesGate />);

        await waitFor(() =>
          expect(screen.getByText("Começou o mata-mata!")).toBeInTheDocument(),
        );
      });

      it("não renderiza nada quando todos os avisos foram vistos localmente", async () => {
        getSession.mockResolvedValue(semSessao());
        avisoVistoLocal.mockReturnValue(true);

        render(<NovidadesGate />);

        await waitFor(() => expect(avisoVistoLocal).toHaveBeenCalledTimes(2));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      it("após fechar o primeiro, exibe o segundo aviso", async () => {
        getSession.mockResolvedValue(semSessao());
        avisoVistoLocal.mockReturnValue(false);

        render(<NovidadesGate />);
        await waitFor(() =>
          expect(screen.getByText("Novidades no bolão")).toBeInTheDocument(),
        );

        await userEvent.click(screen.getByRole("button", { name: /bora!/i }));

        await waitFor(() =>
          expect(screen.getByText("Começou o mata-mata!")).toBeInTheDocument(),
        );
      });
    });
  });

  describe("gatilho de fase (mata-mata)", () => {
    it("não exibe o aviso de mata-mata enquanto os confrontos não estão definidos", async () => {
      getSession.mockResolvedValue(comSessao());
      avisoFoiVisto
        .mockResolvedValueOnce(true) // novidades: visto
        .mockResolvedValueOnce(false); // mata-mata: não visto
      mataMataDefinido.mockResolvedValue(false);

      render(<NovidadesGate />);

      await waitFor(() => expect(mataMataDefinido).toHaveBeenCalled());
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("exibe o aviso de mata-mata assim que os confrontos ficam definidos", async () => {
      getSession.mockResolvedValue(comSessao());
      avisoFoiVisto.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      mataMataDefinido.mockResolvedValue(true);

      render(<NovidadesGate />);

      await waitFor(() =>
        expect(screen.getByText("Começou o mata-mata!")).toBeInTheDocument(),
      );
    });

    it("não checa o gatilho de um aviso já visto", async () => {
      getSession.mockResolvedValue(comSessao());
      avisoFoiVisto.mockResolvedValue(true); // novidades e mata-mata: vistos

      render(<NovidadesGate />);

      await waitFor(() => expect(avisoFoiVisto).toHaveBeenCalledTimes(2));
      expect(mataMataDefinido).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("não renderiza nada enquanto a sessão ainda não foi resolvida", () => {
    getSession.mockReturnValue(new Promise(() => {}));

    render(<NovidadesGate />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ignora a resposta da sessão quando o componente é desmontado antes de ela resolver", async () => {
    let resolverSessao!: (v: { data: { session: null } }) => void;
    getSession.mockReturnValue(new Promise((resolve) => (resolverSessao = resolve)));

    const { unmount } = render(<NovidadesGate />);
    unmount();

    // Resolve a sessão após desmontagem — não deve causar atualização de estado.
    resolverSessao({ data: { session: null } });
    await new Promise<void>((r) => setTimeout(r, 0));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
