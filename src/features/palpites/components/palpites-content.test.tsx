import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import type { User } from "@supabase/supabase-js";
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

vi.mock("@/shared/lib/supabase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/supabase")>()),
  useSupabaseUser: vi.fn(() => ({ id: "user-test" })),
}));

// ---------------------------------------------------------------------------
// Imports pós-mock
// ---------------------------------------------------------------------------

import { toast } from "sonner";
import { usePartidas } from "@/features/partidas";
import { useSupabaseUser } from "@/shared/lib/supabase";
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

const HORA = 60 * 60 * 1000;

/** Cria uma partida de grupos agendada com janela/horário relativos a `agora`. */
function fazerPartida(
  id: string,
  mandante: string,
  visitante: string,
  janelaOffsetMs: number,
  dataHoraOffsetMs: number,
  agora: number
): Partida {
  return {
    id,
    fase: "grupos",
    grupo: "A",
    dataHora: new Date(agora + dataHoraOffsetMs).toISOString(),
    janelaInicio: new Date(agora + janelaOffsetMs).toISOString(),
    estadio: "Estadio X",
    status: "agendada",
    mandante: { id: `${id}-m`, nome: mandante, codigo: mandante.slice(0, 3).toUpperCase() },
    visitante: { id: `${id}-v`, nome: visitante, codigo: visitante.slice(0, 3).toUpperCase() },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
  };
}

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
    localStorage.clear();
    // Restaura o usuário autenticado padrão (testes que precisam o sobrescrevem).
    vi.mocked(useSupabaseUser).mockReturnValue({ id: "user-test" } as User);
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

  // ── Mecânica dia a dia: filtro hoje + amanhã ──────────────────────────────

  it("mostra jogos de hoje e de amanhã, mas não de depois de amanhã", () => {
    const agora = Date.now();
    // HOJE/liberado: janela no passado, jogo ~1h no futuro
    const hoje = fazerPartida("p-hoje", "Brasil", "Argentina", -2 * HORA, 1 * HORA, agora);
    // AMANHÃ/futuro: janela em ~24h, jogo em ~25h
    const amanha = fazerPartida("p-amanha", "França", "Alemanha", 24 * HORA, 25 * HORA, agora);
    // DEPOIS/futuro: janela em ~48h, jogo em ~49h
    const depois = fazerPartida("p-depois", "Japão", "Coreia", 48 * HORA, 49 * HORA, agora);

    mockPartidasOk([hoje, amanha, depois]);
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    // Hoje e amanhã têm inputs editáveis renderizados
    expect(screen.getByRole("spinbutton", { name: /gols do brasil/i })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /gols do frança/i })).toBeInTheDocument();
    // Depois de amanhã não entra na lista
    expect(screen.queryByRole("spinbutton", { name: /gols do japão/i })).not.toBeInTheDocument();
  });

  // ── Palpites antecipados: salvar envia hoje + futuros (com modal na 1ª vez) ──

  it("salva hoje E os antecipados; mostra o modal antes na primeira vez", async () => {
    const user = userEvent.setup();
    const agora = Date.now();
    const hoje = fazerPartida("p-hoje", "Brasil", "Argentina", -2 * HORA, 1 * HORA, agora);
    const amanha = fazerPartida("p-amanha", "França", "Alemanha", 24 * HORA, 25 * HORA, agora);

    mockPartidasOk([hoje, amanha]);
    mockPalpitesOk();
    const { mutateAsync } = mockSalvarOk();

    render(<PalpitesContent />);

    await user.type(screen.getByRole("spinbutton", { name: /gols do brasil/i }), "2");
    await user.type(screen.getByRole("spinbutton", { name: /gols do argentina/i }), "1");
    await user.type(screen.getByRole("spinbutton", { name: /gols do frança/i }), "3");
    await user.type(screen.getByRole("spinbutton", { name: /gols do alemanha/i }), "3");

    await user.click(screen.getByRole("button", { name: /^salvar palpites$/i }));

    // 1ª vez com jogo antecipado: abre o modal antes de gravar
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /entendi, salvar/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(2);
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      partidaId: "p-hoje",
      golsMandante: 2,
      golsVisitante: 1,
    });
    expect(mutateAsync).toHaveBeenCalledWith({
      partidaId: "p-amanha",
      golsMandante: 3,
      golsVisitante: 3,
    });
  });

  it("não mostra o modal de novo depois de já ter confirmado", async () => {
    const user = userEvent.setup();
    localStorage.setItem("palpite-antecipado-confirmado:user-test", "1");
    const agora = Date.now();
    const amanha = fazerPartida("p-amanha", "França", "Alemanha", 24 * HORA, 25 * HORA, agora);

    mockPartidasOk([amanha]);
    mockPalpitesOk();
    const { mutateAsync } = mockSalvarOk();

    render(<PalpitesContent />);

    await user.type(screen.getByRole("spinbutton", { name: /gols do frança/i }), "1");
    await user.type(screen.getByRole("spinbutton", { name: /gols do alemanha/i }), "0");

    await user.click(screen.getByRole("button", { name: /^salvar palpites$/i }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        partidaId: "p-amanha",
        golsMandante: 1,
        golsVisitante: 0,
      });
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Rascunho local: jogos futuros persistem no localStorage ────────────────

  it("persiste rascunho no localStorage ao palpitar num jogo futuro", async () => {
    const user = userEvent.setup();
    const agora = Date.now();
    const amanha = fazerPartida("p-amanha", "França", "Alemanha", 24 * HORA, 25 * HORA, agora);

    mockPartidasOk([amanha]);
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    await user.type(screen.getByRole("spinbutton", { name: /gols do frança/i }), "3");

    await waitFor(() => {
      const cru = localStorage.getItem("palpite-rascunho:user-test:p-amanha");
      expect(cru).not.toBeNull();
      expect(JSON.parse(cru as string)).toEqual({ mandante: "3", visitante: "" });
    });
  });

  it("hidrata o rascunho salvo de um jogo futuro a partir do localStorage", async () => {
    const agora = Date.now();
    const amanha = fazerPartida("p-amanha", "França", "Alemanha", 24 * HORA, 25 * HORA, agora);
    // Rascunho pré-existente no store externo: a hidratação deve preencher os inputs.
    localStorage.setItem(
      "palpite-rascunho:user-test:p-amanha",
      JSON.stringify({ mandante: "1", visitante: "2" })
    );

    mockPartidasOk([amanha]);
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: /gols do frança/i })).toHaveValue(1);
    });
    expect(screen.getByRole("spinbutton", { name: /gols do alemanha/i })).toHaveValue(2);
  });

  it("não re-hidrata uma partida futura já processada quando a lista é refeita", () => {
    const agora = Date.now();
    const amanha = fazerPartida("p-amanha", "França", "Alemanha", 24 * HORA, 25 * HORA, agora);

    mockPartidasOk([amanha]);
    mockPalpitesOk();
    mockSalvarOk();

    const { rerender } = render(<PalpitesContent />);

    // Nova referência de lista (mesma partida) força o efeito de hidratação a
    // rodar de novo; a partida já está no ref de hidratadas → ramo `continue`.
    vi.mocked(usePartidas).mockReturnValue({
      data: [{ ...amanha }],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as UseQueryResult<Partida[], Error>);
    rerender(<PalpitesContent />);

    expect(screen.getByRole("spinbutton", { name: /gols do frança/i })).toBeInTheDocument();
  });

  it("não tenta hidratar rascunhos quando não há usuário autenticado", () => {
    vi.mocked(useSupabaseUser).mockReturnValue(null);
    const agora = Date.now();
    const amanha = fazerPartida("p-amanha", "França", "Alemanha", 24 * HORA, 25 * HORA, agora);
    // Rascunho existe, mas com userId nulo o efeito retorna antes de lê-lo.
    localStorage.setItem(
      "palpite-rascunho:user-test:p-amanha",
      JSON.stringify({ mandante: "1", visitante: "2" })
    );

    mockPartidasOk([amanha]);
    mockPalpitesOk();
    mockSalvarOk();

    render(<PalpitesContent />);

    // O input do jogo futuro renderiza vazio (sem hidratação).
    expect(screen.getByRole("spinbutton", { name: /gols do frança/i })).toHaveValue(null);
  });

  it("reage à borda: ao virar a janela do jogo, atualiza o instante e refaz o fetch", () => {
    vi.useFakeTimers();
    try {
      const agora = Date.now();
      // Jogo futuro cuja janela abre ~2s à frente → agenda timer até a borda.
      const futura = fazerPartida("p-fut", "França", "Alemanha", 2000, 10 * HORA, agora);
      const { refetch } = mockPartidasOk([futura]);
      mockPalpitesOk();
      mockSalvarOk();

      render(<PalpitesContent />);
      expect(refetch).not.toHaveBeenCalled();

      // Avança além da borda → o timer dispara onBorda (setAgora + refetch).
      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(refetch).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
