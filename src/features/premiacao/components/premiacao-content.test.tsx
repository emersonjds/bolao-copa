import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../api/queries", () => ({ useContagemInscritos: vi.fn() }));
import { useContagemInscritos } from "../api/queries";
import { PremiacaoContent } from "./premiacao-content";

const mock = vi.mocked(useContagemInscritos);

describe("PremiacaoContent", () => {
  it("mostra a regra de divisão 50/30/20 e a inscrição", () => {
    mock.mockReturnValue({ data: undefined, isLoading: false, isError: false } as ReturnType<
      typeof useContagemInscritos
    >);
    render(<PremiacaoContent />);
    expect(screen.getByText(/R\$\s*10/)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText(/30%/)).toBeInTheDocument();
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });
  it("mostra o card do campeão (camisa OU dinheiro)", () => {
    mock.mockReturnValue({ data: undefined, isLoading: false, isError: false } as ReturnType<
      typeof useContagemInscritos
    >);
    render(<PremiacaoContent />);
    expect(screen.getByText(/camisa oficial/i)).toBeInTheDocument();
  });
  it("com contagem, mostra o pote e os valores por colocação", () => {
    mock.mockReturnValue({ data: 87, isLoading: false, isError: false } as ReturnType<
      typeof useContagemInscritos
    >);
    render(<PremiacaoContent />);
    expect(screen.getByText(/87 inscritos/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*870/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*435/)).toBeInTheDocument();
  });
  it("sem contagem, degrada para a regra em % sem quebrar", () => {
    mock.mockReturnValue({ data: undefined, isLoading: false, isError: true } as ReturnType<
      typeof useContagemInscritos
    >);
    render(<PremiacaoContent />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.queryByText(/Pote atual/i)).not.toBeInTheDocument();
  });
});
