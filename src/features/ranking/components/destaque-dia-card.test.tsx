import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DestaqueDiaCard } from "./destaque-dia-card";
import { useDestaqueDia } from "../api/queries";
import type { DestaqueDia } from "@/entities/ranking";

vi.mock("../api/queries", () => ({ useDestaqueDia: vi.fn() }));

const mockedUseDestaqueDia = vi.mocked(useDestaqueDia);

function comDados(data: DestaqueDia[] | undefined, isLoading = false) {
  mockedUseDestaqueDia.mockReturnValue({ data, isLoading } as unknown as ReturnType<
    typeof useDestaqueDia
  >);
}

const base: DestaqueDia = {
  // Data passada fixa (não-hoje/ontem) → rótulo determinístico com weekday + data.
  dia: "2024-03-15",
  participanteId: "p1",
  nome: "Ana Atacante",
  avatarUrl: null,
  pontosDia: 11,
};

describe("DestaqueDiaCard", () => {
  beforeEach(() => mockedUseDestaqueDia.mockReset());

  it("mostra skeleton enquanto carrega", () => {
    comDados(undefined, true);
    const { container } = render(<DestaqueDiaCard />);
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it("não renderiza nada quando não há destaque", () => {
    comDados([]);
    const { container } = render(<DestaqueDiaCard />);
    expect(container.firstChild).toBeNull();
  });

  it("mostra 'Craque do dia', o nome, os pontos e a data", () => {
    comDados([base]);
    render(<DestaqueDiaCard />);
    expect(screen.getByText("Craque do dia")).toBeInTheDocument();
    expect(screen.getByText("Ana Atacante")).toBeInTheDocument();
    expect(screen.getByText("11 pts")).toBeInTheDocument();
    expect(screen.getByText(/15 mar/i)).toBeInTheDocument();
  });

  it("usa plural 'pts' e singular 'pt' conforme a pontuação", () => {
    comDados([{ ...base, pontosDia: 1 }]);
    render(<DestaqueDiaCard />);
    expect(screen.getByText("1 pt")).toBeInTheDocument();
  });

  it("mostra 'Craques do dia' quando há empate na liderança", () => {
    comDados([base, { ...base, participanteId: "p2", nome: "Bruno Zagueiro" }]);
    render(<DestaqueDiaCard />);
    expect(screen.getByText("Craques do dia")).toBeInTheDocument();
    expect(screen.getByText("Ana Atacante")).toBeInTheDocument();
    expect(screen.getByText("Bruno Zagueiro")).toBeInTheDocument();
  });
});
