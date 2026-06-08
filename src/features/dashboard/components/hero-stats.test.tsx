import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@supabase/supabase-js";
import { fakeUser } from "@/test/render";
import { useAuth, useUser } from "@/features/auth";
import { useRanking } from "@/features/ranking";
import { useMeuParticipanteId, signInWithGoogle } from "@/shared/lib/supabase";
import { HeroStats } from "./hero-stats";

vi.mock("@/features/auth", () => ({
  useAuth: vi.fn(),
  useUser: vi.fn(),
}));
vi.mock("@/features/ranking", () => ({
  useRanking: vi.fn(),
}));
vi.mock("@/shared/lib/supabase", () => ({
  useMeuParticipanteId: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

type UseRankingResult = ReturnType<typeof useRanking>;

interface SetupOptions {
  authLoading?: boolean;
  user?: User | null;
  meuId?: string | null;
  ranking?: UseRankingResult["data"];
  rankingLoading?: boolean;
  isError?: boolean;
  refetch?: () => void;
}

function setup({
  authLoading = false,
  user = null,
  meuId = null,
  ranking = [],
  rankingLoading = false,
  isError = false,
  refetch = vi.fn(),
}: SetupOptions = {}) {
  vi.mocked(useAuth).mockReturnValue({ loading: authLoading } as ReturnType<typeof useAuth>);
  vi.mocked(useUser).mockReturnValue(user);
  vi.mocked(useMeuParticipanteId).mockReturnValue(meuId);
  vi.mocked(useRanking).mockReturnValue({
    data: ranking,
    isLoading: rankingLoading,
    isError,
    refetch,
  } as UseRankingResult);
}

const itemRanking = {
  participanteId: "part-id-1",
  nome: "Tester",
  avatarUrl: null,
  pontosTotais: 12,
  jogosPontuados: 4,
};

describe("HeroStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra skeleton enquanto a autenticação carrega", () => {
    setup({ authLoading: true });
    const { container } = render(<HeroStats />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("mostra skeleton quando logado e o ranking ainda carrega", () => {
    setup({ user: fakeUser(), rankingLoading: true });
    const { container } = render(<HeroStats />);

    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("mostra card de login quando não há usuário e dispara signInWithGoogle", async () => {
    setup({ user: null });
    render(<HeroStats />);

    expect(screen.getByText("Faça login para ver sua posição")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
    expect(signInWithGoogle).toHaveBeenCalledOnce();
  });

  it("mostra estado de erro e permite tentar novamente", async () => {
    const refetch = vi.fn();
    setup({ user: fakeUser(), isError: true, refetch });
    render(<HeroStats />);

    expect(screen.getByText(/Não foi possível carregar os dados/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("mostra posição, pontos e jogos pontuados do usuário logado", () => {
    setup({
      user: fakeUser({ user_metadata: { full_name: "Maria Silva" } }),
      meuId: "part-id-1",
      ranking: [itemRanking],
    });
    render(<HeroStats />);

    expect(screen.getByText("Olá, Maria")).toBeInTheDocument();
    expect(screen.getByText("1º")).toBeInTheDocument();
    expect(screen.getByText("de 1 participantes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("calcula a posição correta com vários participantes", () => {
    const outro = { ...itemRanking, participanteId: "outro", nome: "Outro" };
    setup({
      user: fakeUser(),
      meuId: "part-id-1",
      ranking: [outro, itemRanking],
    });
    render(<HeroStats />);

    expect(screen.getByText("2º")).toBeInTheDocument();
    expect(screen.getByText("de 2 participantes")).toBeInTheDocument();
  });

  it("usa 'Campeão' como saudação quando o usuário não tem nome", () => {
    setup({
      user: fakeUser({ user_metadata: {} }),
      meuId: "part-id-1",
      ranking: [itemRanking],
    });
    render(<HeroStats />);

    expect(screen.getByText("Olá, Campeão")).toBeInTheDocument();
  });

  it("mostra aviso de sem palpites quando o participante não está no ranking", () => {
    setup({ user: fakeUser(), meuId: "inexistente", ranking: [itemRanking] });
    render(<HeroStats />);

    expect(screen.getByText("Ainda sem palpites pontuados.")).toBeInTheDocument();
  });

  it("mostra aviso de sem palpites quando não há participante associado", () => {
    setup({ user: fakeUser(), meuId: null, ranking: [itemRanking] });
    render(<HeroStats />);

    expect(screen.getByText("Ainda sem palpites pontuados.")).toBeInTheDocument();
  });

  it("totalParticipantes é zero quando useRanking retorna data: undefined", () => {
    // Cobre a branch `?? 0` da linha 78: ranking?.length = undefined (??  usa o fallback 0).
    // Usa mock direto em vez de setup() pois a desestruturação padrão `ranking = []`
    // substituiria undefined pelo array vazio, impedindo o branch de ser atingido.
    vi.mocked(useAuth).mockReturnValue({ loading: false } as ReturnType<typeof useAuth>);
    vi.mocked(useUser).mockReturnValue(fakeUser());
    vi.mocked(useMeuParticipanteId).mockReturnValue("part-id-1");
    vi.mocked(useRanking).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as UseRankingResult);
    render(<HeroStats />);

    expect(screen.getByText("Ainda sem palpites pontuados.")).toBeInTheDocument();
  });
});
