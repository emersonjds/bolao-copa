import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ItemRanking } from "@/entities/ranking";

// vi.mock é hoisted — os módulos abaixo já recebem as versões mockadas
vi.mock("../api/queries", () => ({
  useRanking: vi.fn(),
  // useDestaqueRodada é usado pelo DestaqueRodadaCard renderizado dentro de RankingContent
  useDestaqueRodada: vi.fn(),
}));

vi.mock("@/shared/lib/supabase", () => ({
  useMeuParticipanteId: vi.fn(),
}));

import { useRanking, useDestaqueRodada } from "../api/queries";
import { useMeuParticipanteId } from "@/shared/lib/supabase";
import { RankingContent } from "./ranking-content";

const mockedUseRanking = vi.mocked(useRanking);
const mockedUseDestaqueRodada = vi.mocked(useDestaqueRodada);
const mockedUseMeuParticipanteId = vi.mocked(useMeuParticipanteId);

function makeItem(
  overrides: Partial<ItemRanking> & { participanteId: string; nome: string }
): ItemRanking {
  return {
    avatarUrl: null,
    pontosTotais: 10,
    jogosPontuados: 3,
    ...overrides,
  };
}

/** Cria um ranking com N participantes, IDs e nomes automáticos. */
function makeRanking(quantidade: number, meuId?: string): ItemRanking[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const posicao = i + 1;
    const participanteId = posicao === 4 && meuId ? meuId : `id-${posicao}`;
    return makeItem({
      participanteId,
      nome: `Participante ${posicao}`,
      pontosTotais: (quantidade - i) * 5,
    });
  });
}

describe("RankingContent", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // DestaqueRodadaCard renderiza dentro de RankingContent em todos os estados
    // que chegam até os dados; retornamos vazio para não interferir nos demais asserts.
    mockedUseDestaqueRodada.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);
    mockedUseMeuParticipanteId.mockReturnValue(null);
  });

  // ---------------------------------------------------------------------------
  // Estado: carregando
  // ---------------------------------------------------------------------------

  it("exibe wrapper com aria-busy e aria-label durante o carregamento", () => {
    mockedUseRanking.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    const loading = screen.getByLabelText("Carregando ranking");
    expect(loading).toHaveAttribute("aria-busy", "true");
  });

  // ---------------------------------------------------------------------------
  // Estado: erro
  // ---------------------------------------------------------------------------

  it("exibe mensagem de erro quando a query falha", () => {
    mockedUseRanking.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    expect(
      screen.getByText("Não foi possível carregar o ranking. Tente novamente.")
    ).toBeInTheDocument();
  });

  it("exibe botão 'Tentar novamente' e chama refetch ao clicar", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockedUseRanking.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    const botao = screen.getByRole("button", { name: /tentar novamente/i });
    expect(botao).toBeInTheDocument();

    await userEvent.click(botao);

    expect(refetch).toHaveBeenCalledOnce();
  });

  // ---------------------------------------------------------------------------
  // Estado: vazio
  // ---------------------------------------------------------------------------

  it("exibe estado vazio quando data é array vazio", () => {
    mockedUseRanking.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    expect(screen.getByText("Nenhum resultado apurado ainda")).toBeInTheDocument();
    expect(
      screen.getByText(/O ranking aparece após o primeiro resultado apurado/)
    ).toBeInTheDocument();
  });

  it("exibe estado vazio quando data é undefined e não está carregando nem em erro", () => {
    mockedUseRanking.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    expect(screen.getByText("Nenhum resultado apurado ainda")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Estado: dados disponíveis — pódio
  // ---------------------------------------------------------------------------

  it("renderiza o pódio top-3 quando há participantes suficientes", () => {
    mockedUseRanking.mockReturnValue({
      data: makeRanking(3),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    expect(screen.getByRole("region", { name: "Pódio — top 3" })).toBeInTheDocument();
  });

  it("renderiza o pódio com apenas 1 participante", () => {
    mockedUseRanking.mockReturnValue({
      data: [makeItem({ participanteId: "id-1", nome: "Solitário", pontosTotais: 30 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    expect(screen.getByRole("region", { name: "Pódio" })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sem duplicação de "Você" — o banner separado foi removido (decisão de UX).
  // O usuário aparece uma única vez, destacado na própria lista.
  // ---------------------------------------------------------------------------

  it("não renderiza um banner 'Sua posição' separado quando o usuário está fora do top-3", () => {
    const ranking = makeRanking(6, "meu-id");
    mockedUseMeuParticipanteId.mockReturnValue("meu-id");
    mockedUseRanking.mockReturnValue({
      data: ranking,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    expect(screen.queryByRole("region", { name: /sua posição/i })).not.toBeInTheDocument();
  });

  it("destaca 'Você' uma única vez, na linha da lista, quando o usuário está em 4º lugar", () => {
    const ranking = [
      makeItem({ participanteId: "id-1", nome: "Primeiro", pontosTotais: 30 }),
      makeItem({ participanteId: "id-2", nome: "Segundo", pontosTotais: 20 }),
      makeItem({ participanteId: "id-3", nome: "Terceiro", pontosTotais: 10 }),
      makeItem({ participanteId: "meu-id", nome: "Eu", pontosTotais: 5 }),
    ];
    mockedUseMeuParticipanteId.mockReturnValue("meu-id");
    mockedUseRanking.mockReturnValue({
      data: ranking,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    // A linha do 4º lugar é a única do usuário e carrega o destaque.
    const linhaUsuario = screen.getByLabelText("4º lugar").closest("li");
    expect(linhaUsuario).toHaveAttribute("aria-current", "true");
    // "Você" aparece só dentro dessa linha — nenhuma outra ocorrência na tela.
    const ocorrenciasVoce = screen.getAllByText("Você");
    ocorrenciasVoce.forEach((node) => expect(linhaUsuario).toContainElement(node));
  });

  // ---------------------------------------------------------------------------
  // ListaRanking — participantes a partir do 4º lugar
  // ---------------------------------------------------------------------------

  it("exibe ListaRanking com participantes do 4º lugar em diante", () => {
    const ranking = makeRanking(5);
    mockedUseRanking.mockReturnValue({
      data: ranking,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    // 4º e 5º devem estar na lista
    expect(screen.getByLabelText("4º lugar")).toBeInTheDocument();
    expect(screen.getByLabelText("5º lugar")).toBeInTheDocument();
    // 1º ao 3º estão no pódio, não na lista
    expect(screen.queryByLabelText("1º lugar")).not.toBeInTheDocument();
  });

  it("não exibe ListaRanking quando todos participantes cabem no pódio (≤ 3)", () => {
    mockedUseRanking.mockReturnValue({
      data: makeRanking(3),
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    // Nenhum item numerado após o 3º deve aparecer
    expect(screen.queryByLabelText("4º lugar")).not.toBeInTheDocument();
  });

  it("destaca o participante logado na ListaRanking quando está fora do top-3", () => {
    const ranking = [
      makeItem({ participanteId: "id-1", nome: "Primeiro", pontosTotais: 30 }),
      makeItem({ participanteId: "id-2", nome: "Segundo", pontosTotais: 20 }),
      makeItem({ participanteId: "id-3", nome: "Terceiro", pontosTotais: 10 }),
      makeItem({ participanteId: "meu-id", nome: "Eu", pontosTotais: 5 }),
      makeItem({ participanteId: "id-5", nome: "Quinto", pontosTotais: 2 }),
    ];
    mockedUseMeuParticipanteId.mockReturnValue("meu-id");
    mockedUseRanking.mockReturnValue({
      data: ranking,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useRanking>);

    render(<RankingContent />);

    // O item do usuário na lista deve ter aria-current
    const itensLista = screen.getAllByRole("listitem");
    // O primeiro listitem na lista (4º geral = 1º na lista) é o usuário
    expect(itensLista[0]).toHaveAttribute("aria-current", "true");
    expect(itensLista[1]).not.toHaveAttribute("aria-current");
  });
});
