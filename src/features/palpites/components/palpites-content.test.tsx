import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import type { UseQueryResult, UseMutationResult } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Mocks — içados pelo Vitest antes de qualquer import
// ---------------------------------------------------------------------------

vi.mock("@/shared/ui/flag-icon", () => ({
  FlagIcon: ({ nome }: { nome: string }) => <span data-testid="bandeira">{nome}</span>,
}));

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(() => "mock-toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock("@/features/partidas", () => ({
  usePartidas: vi.fn(),
}));

vi.mock("../api/queries", () => ({
  useMeusPalpites: vi.fn(),
  useSalvarPalpite: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports pós-mock
// ---------------------------------------------------------------------------

import { toast } from "sonner";
import { usePartidas } from "@/features/partidas";
import { useMeusPalpites, useSalvarPalpite } from "../api/queries";
import { PalpitesContent } from "./palpites-content";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Partida aberta (futura, agendada, na fase de grupos). */
const partidaAberta: Partida = {
  id: "part-1",
  fase: "grupos",
  grupo: "A",
  dataHora: "2099-06-20T19:00:00.000Z",
  janelaInicio: "2020-01-01T03:00:00Z",
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

const palpiteSalvo: Palpite = {
  id: "palp-1",
  participanteId: "part-id-1",
  partidaId: "part-1",
  golsMandante: 2,
  golsVisitante: 0,
  pontos: null,
};

// ---------------------------------------------------------------------------
// Helpers de mock
// ---------------------------------------------------------------------------

function mockPartidasOk(partidas: Partida[] = [partidaAberta]) {
  const refetch = vi.fn();
  vi.mocked(usePartidas).mockReturnValue({
    data: partidas,
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as UseQueryResult<Partida[], Error>);
  return { refetch };
}

function mockPartidasLoading() {
  vi.mocked(usePartidas).mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    refetch: vi.fn(),
  } as unknown as UseQueryResult<Partida[], Error>);
}

function mockPartidasError() {
  const refetch = vi.fn();
  vi.mocked(usePartidas).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch,
  } as unknown as UseQueryResult<Partida[], Error>);
  return { refetch };
}

function mockPalpitesOk(palpites: Palpite[] = []) {
  vi.mocked(useMeusPalpites).mockReturnValue({
    data: palpites,
    isPending: false,
  } as unknown as ReturnType<typeof useMeusPalpites>);
}

function mockPalpitesLoading() {
  vi.mocked(useMeusPalpites).mockReturnValue({
    data: undefined,
    isPending: true,
  } as unknown as ReturnType<typeof useMeusPalpites>);
}

/** Resolvido (isPending=false) mas com data undefined → exercita os fallbacks `?? []`. */
function mockPalpitesUndefined() {
  vi.mocked(useMeusPalpites).mockReturnValue({
    data: undefined,
    isPending: false,
  } as unknown as ReturnType<typeof useMeusPalpites>);
}

function mockSalvarOk() {
  const mutateAsync = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useSalvarPalpite).mockReturnValue({
    mutateAsync,
  } as unknown as UseMutationResult<
    void,
    Error,
    { partidaId: string; golsMandante: number; golsVisitante: number }
  >);
  return { mutateAsync };
}

function mockSalvarError(message: string) {
  const mutateAsync = vi.fn().mockRejectedValue(new Error(message));
  vi.mocked(useSalvarPalpite).mockReturnValue({
    mutateAsync,
  } as unknown as UseMutationResult<
    void,
    Error,
    { partidaId: string; golsMandante: number; golsVisitante: number }
  >);
  return { mutateAsync };
}

/** Rejeita com um valor que NÃO é instância de Error (ex.: string). */
function mockSalvarRejeicaoNaoError(valor: unknown) {
  const mutateAsync = vi.fn().mockRejectedValue(valor);
  vi.mocked(useSalvarPalpite).mockReturnValue({
    mutateAsync,
  } as unknown as UseMutationResult<
    void,
    Error,
    { partidaId: string; golsMandante: number; golsVisitante: number }
  >);
  return { mutateAsync };
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("PalpitesContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  it("exibe skeleton de carregamento enquanto os dados estão sendo buscados", () => {
    mockPartidasLoading();
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    // O container do skeleton recebe aria-busy="true"
    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  it("exibe skeleton quando palpites estão pendentes mesmo com partidas carregadas", () => {
    mockPartidasOk();
    mockPalpitesLoading();
    mockSalvarOk();

    render(<PalpitesContent />);

    expect(document.querySelector("[aria-busy='true']")).toBeInTheDocument();
  });

  // ── Erro ──────────────────────────────────────────────────────────────────

  it("exibe mensagem de erro e botão de retry quando usePartidas retorna isError=true", async () => {
    const { refetch } = mockPartidasError();
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    expect(screen.getByText(/não foi possível carregar os jogos/i)).toBeInTheDocument();

    const botaoRetry = screen.getByRole("button", { name: /tentar novamente/i });
    await userEvent.click(botaoRetry);

    expect(refetch).toHaveBeenCalledOnce();
  });

  // ── Vazio ─────────────────────────────────────────────────────────────────

  it("exibe mensagem de nenhum jogo quando a lista de partidas está vazia", () => {
    mockPartidasOk([]);
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    expect(screen.getByText(/nenhum jogo aberto para palpite no momento/i)).toBeInTheDocument();
  });

  // ── Conteúdo principal ────────────────────────────────────────────────────

  it("renderiza o seletor de vista e o filtro de fase quando há partidas", () => {
    mockPartidasOk();
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    expect(screen.getByRole("tab", { name: "Palpitar" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Histórico" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Fase de Grupos" })).toBeInTheDocument();
  });

  // ── Troca de aba ──────────────────────────────────────────────────────────

  it("exibe o histórico vazio ao alternar para a aba Histórico", async () => {
    mockPartidasOk([partidaAberta]); // partida aberta → não aparece no histórico
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    await userEvent.click(screen.getByRole("tab", { name: "Histórico" }));

    expect(screen.getByText(/nenhum jogo encerrado ainda/i)).toBeInTheDocument();
  });

  // ── Preencher e salvar (sucesso) ──────────────────────────────────────────

  it("preenche os placares, habilita o BotaoSalvar e salva com toast de sucesso", async () => {
    const user = userEvent.setup();
    mockPartidasOk();
    mockPalpitesOk(); // sem palpite salvo → qualquer valor local é pendente
    const { mutateAsync } = mockSalvarOk();

    render(<PalpitesContent />);

    // Preenche ambos os inputs para ativar hasPendingChanges
    const inputMandante = screen.getByRole("spinbutton", { name: /gols do brasil/i });
    const inputVisitante = screen.getByRole("spinbutton", { name: /gols do argentina/i });

    await user.clear(inputMandante);
    await user.type(inputMandante, "2");
    await user.clear(inputVisitante);
    await user.type(inputVisitante, "1");

    const botaoSalvar = screen.getByRole("button", { name: /salvar palpites/i });
    await user.click(botaoSalvar);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        partidaId: "part-1",
        golsMandante: 2,
        golsVisitante: 1,
      });
    });

    expect(toast.success).toHaveBeenCalledWith("Palpites salvos!", {
      id: "mock-toast-id",
    });
  });

  // ── Erro de trava (lock) ──────────────────────────────────────────────────

  it("exibe toast de aviso amigável quando o banco rejeita por trava de horário", async () => {
    const user = userEvent.setup();
    mockPartidasOk();
    mockPalpitesOk();
    mockSalvarError("Falha ao salvar palpite: Palpite encerrado: a partida já começou");

    // Substituímos o usePartidas com refetch rastreável
    const trackableRefetch = vi.fn();
    vi.mocked(usePartidas).mockReturnValue({
      data: [partidaAberta],
      isLoading: false,
      isError: false,
      refetch: trackableRefetch,
    } as unknown as UseQueryResult<Partida[], Error>);
    // Regera o mock de salvar após o novo usePartidas
    mockSalvarError("Falha ao salvar palpite: Palpite encerrado: a partida já começou");

    render(<PalpitesContent />);

    await user.clear(screen.getByRole("spinbutton", { name: /gols do brasil/i }));
    await user.type(screen.getByRole("spinbutton", { name: /gols do brasil/i }), "3");
    await user.clear(screen.getByRole("spinbutton", { name: /gols do argentina/i }));
    await user.type(screen.getByRole("spinbutton", { name: /gols do argentina/i }), "0");

    await user.click(screen.getByRole("button", { name: /salvar palpites/i }));

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledWith(
        "Tarde demais! Esse jogo já começou e os palpites dele fecharam no apito inicial.",
        { id: "mock-toast-id" }
      );
    });

    expect(trackableRefetch).toHaveBeenCalledOnce();
  });

  // ── Erro genérico ─────────────────────────────────────────────────────────

  it("exibe toast de erro genérico quando o banco retorna uma falha desconhecida", async () => {
    const user = userEvent.setup();
    vi.mocked(usePartidas).mockReturnValue({
      data: [partidaAberta],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<Partida[], Error>);
    mockPalpitesOk();
    mockSalvarError("Falha ao salvar palpite: unexpected database error");

    render(<PalpitesContent />);

    await user.type(screen.getByRole("spinbutton", { name: /gols do brasil/i }), "1");
    await user.type(screen.getByRole("spinbutton", { name: /gols do argentina/i }), "0");

    await user.click(screen.getByRole("button", { name: /salvar palpites/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Não foi possível salvar agora. Tente novamente em instantes.",
        { id: "mock-toast-id" }
      );
    });
  });

  it("exibe toast de erro genérico quando o erro rejeitado não é instância de Error", async () => {
    const user = userEvent.setup();
    mockPartidasOk();
    mockPalpitesOk();
    mockSalvarRejeicaoNaoError("falha em texto puro, sem ser Error");

    render(<PalpitesContent />);

    await user.type(screen.getByRole("spinbutton", { name: /gols do brasil/i }), "1");
    await user.type(screen.getByRole("spinbutton", { name: /gols do argentina/i }), "0");
    await user.click(screen.getByRole("button", { name: /salvar palpites/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Não foi possível salvar agora. Tente novamente em instantes.",
        { id: "mock-toast-id" }
      );
    });
  });

  // ── Fallbacks `meusPalpites ?? []` ─────────────────────────────────────────

  it("trata meusPalpites undefined (sem palpites carregados) sem quebrar", async () => {
    const user = userEvent.setup();
    mockPartidasOk([partidaAberta]);
    mockPalpitesUndefined(); // data undefined, isPending false → fallbacks `?? []`
    mockSalvarOk();

    render(<PalpitesContent />);

    // Preencher ambos os campos aciona ehPendente, que lê `(meusPalpites ?? [])`.
    await user.type(screen.getByRole("spinbutton", { name: /gols do brasil/i }), "1");
    await user.type(screen.getByRole("spinbutton", { name: /gols do argentina/i }), "0");

    // hasPendingChanges ficou true → o botão de salvar aparece.
    expect(screen.getByRole("button", { name: /salvar palpites/i })).toBeInTheDocument();

    // O Histórico também recebe `meusPalpites ?? []`.
    await user.click(screen.getByRole("tab", { name: "Histórico" }));
    expect(screen.getByText(/nenhum jogo encerrado ainda/i)).toBeInTheDocument();
  });

  // ── Pendência vs. palpite salvo (ambos os ramos do ||) ─────────────────────

  it("marca pendente quando o gol do mandante difere do palpite salvo", async () => {
    const user = userEvent.setup();
    mockPartidasOk([partidaAberta]);
    mockPalpitesOk([palpiteSalvo]); // salvo: 2 × 0
    mockSalvarOk();

    render(<PalpitesContent />);

    const mandante = screen.getByRole("spinbutton", { name: /gols do brasil/i });
    const visitante = screen.getByRole("spinbutton", { name: /gols do argentina/i });

    // Limpa (valor "") e redigita: mandante diferente do salvo, visitante igual.
    await user.clear(mandante);
    await user.type(mandante, "3"); // 3 !== "2" → ramo esquerdo do || verdadeiro
    await user.clear(visitante);
    await user.type(visitante, "0"); // igual ao salvo

    expect(screen.getByRole("button", { name: /salvar palpites/i })).toBeInTheDocument();
  });

  it("marca pendente quando só o gol do visitante difere do palpite salvo", async () => {
    const user = userEvent.setup();
    mockPartidasOk([partidaAberta]);
    mockPalpitesOk([palpiteSalvo]); // salvo: 2 × 0
    mockSalvarOk();

    render(<PalpitesContent />);

    const mandante = screen.getByRole("spinbutton", { name: /gols do brasil/i });
    const visitante = screen.getByRole("spinbutton", { name: /gols do argentina/i });

    await user.clear(mandante);
    await user.type(mandante, "2"); // igual ao salvo → ramo esquerdo falso
    await user.clear(visitante);
    await user.type(visitante, "1"); // 1 !== "0" → ramo direito do || avaliado

    expect(screen.getByRole("button", { name: /salvar palpites/i })).toBeInTheDocument();
  });

  it("não fica pendente quando o placar local é idêntico ao palpite salvo", async () => {
    const user = userEvent.setup();
    mockPartidasOk([partidaAberta]);
    mockPalpitesOk([palpiteSalvo]); // salvo: 2 × 0
    mockSalvarOk();

    render(<PalpitesContent />);

    const mandante = screen.getByRole("spinbutton", { name: /gols do brasil/i });
    const visitante = screen.getByRole("spinbutton", { name: /gols do argentina/i });

    await user.clear(mandante);
    await user.type(mandante, "2");
    await user.clear(visitante);
    await user.type(visitante, "0"); // igual em ambos → não pendente

    // Sem pendências e sem salvamento em curso → BotaoSalvar não renderiza.
    expect(screen.queryByRole("button", { name: /salvar palpites/i })).not.toBeInTheDocument();
  });
});
