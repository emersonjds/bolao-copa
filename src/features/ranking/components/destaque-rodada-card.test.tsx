import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DestaqueRodada } from "@/entities/ranking";

// Mocks declarados antes dos imports que os consomem (hoisting garante a ordem)
vi.mock("../api/queries", () => ({
  useDestaqueRodada: vi.fn(),
}));

import { useDestaqueRodada } from "../api/queries";
import { DestaqueRodadaCard } from "./destaque-rodada-card";

const mockedUseDestaqueRodada = vi.mocked(useDestaqueRodada);

function makeDestaque(overrides: Partial<DestaqueRodada> = {}): DestaqueRodada {
  return {
    rodada: 1,
    participanteId: "part-id-1",
    nome: "Tester",
    avatarUrl: null,
    pontosRodada: 8,
    ...overrides,
  };
}

describe("DestaqueRodadaCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Estados de carregamento / ausência de dados
  // ---------------------------------------------------------------------------

  it("exibe skeleton com aria-busy durante carregamento", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    const { container } = render(<DestaqueRodadaCard />);

    const skeleton = container.querySelector('[aria-busy="true"]');
    expect(skeleton).toBeInTheDocument();
  });

  it("retorna null quando data está vazia (nenhuma rodada apurada)", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    const { container } = render(<DestaqueRodadaCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("retorna null quando data é undefined e não está carregando", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    const { container } = render(<DestaqueRodadaCard />);
    expect(container).toBeEmptyDOMElement();
  });

  // ---------------------------------------------------------------------------
  // Vencedor único
  // ---------------------------------------------------------------------------

  it("exibe o card com aria-label 'Destaque da rodada' quando há dados", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [makeDestaque()],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByRole("region", { name: "Destaque da rodada" })).toBeInTheDocument();
  });

  it("exibe 'Craque da rodada' no singular para um único vencedor", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [makeDestaque()],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByText("Craque da rodada")).toBeInTheDocument();
    expect(screen.queryByText("Craques da rodada")).not.toBeInTheDocument();
  });

  it("exibe o número da rodada corretamente", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [makeDestaque({ rodada: 3 })],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByText("Rodada 3")).toBeInTheDocument();
  });

  it("exibe o nome do destaque", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [makeDestaque({ nome: "Zezinho da Copa" })],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByText("Zezinho da Copa")).toBeInTheDocument();
  });

  it("exibe 'pt' no singular para 1 ponto na rodada", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [makeDestaque({ pontosRodada: 1 })],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByText("1 pt")).toBeInTheDocument();
  });

  it("exibe 'pts' no plural para múltiplos pontos na rodada", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [makeDestaque({ pontosRodada: 12 })],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByText("12 pts")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Empate — múltiplos destaques
  // ---------------------------------------------------------------------------

  it("exibe 'Craques da rodada' no plural quando há empate na liderança", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [
        makeDestaque({ participanteId: "id-1", nome: "Alpha", pontosRodada: 8 }),
        makeDestaque({ participanteId: "id-2", nome: "Beta", pontosRodada: 8 }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByText("Craques da rodada")).toBeInTheDocument();
    expect(screen.queryByText("Craque da rodada")).not.toBeInTheDocument();
  });

  it("exibe todos os nomes empatados no empate de 3 participantes", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [
        makeDestaque({ participanteId: "id-1", nome: "Craque A" }),
        makeDestaque({ participanteId: "id-2", nome: "Craque B" }),
        makeDestaque({ participanteId: "id-3", nome: "Craque C" }),
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(screen.getByText("Craque A")).toBeInTheDocument();
    expect(screen.getByText("Craque B")).toBeInTheDocument();
    expect(screen.getByText("Craque C")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Props opcionais
  // ---------------------------------------------------------------------------

  it("aplica className customizado ao section quando fornecido", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [makeDestaque()],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard className="minha-classe-extra" />);

    expect(screen.getByRole("region", { name: "Destaque da rodada" })).toHaveClass(
      "minha-classe-extra"
    );
  });

  it("repassa a rodada explícita para o hook", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard rodada={2} />);

    expect(mockedUseDestaqueRodada).toHaveBeenCalledWith(2);
  });

  it("chama o hook com undefined quando rodada não é informada", () => {
    mockedUseDestaqueRodada.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useDestaqueRodada>);

    render(<DestaqueRodadaCard />);

    expect(mockedUseDestaqueRodada).toHaveBeenCalledWith(undefined);
  });
});
