import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import RegrasPage from "./page";

describe("RegrasPage — pontos por fase", () => {
  it("mostra a tabela transparente de pontos por fase", () => {
    render(<RegrasPage />);
    expect(screen.getByText("Pontos por fase")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("aplica o peso da fase em cada acerto (base × multiplicador)", () => {
    render(<RegrasPage />);
    const tabela = screen.getByRole("table");

    // Cravar na final/semi (×3): 5→15, 4→12, 3→9, 2→6.
    expect(within(tabela).getByText("15")).toBeInTheDocument();
    expect(within(tabela).getByText("12")).toBeInTheDocument();
    // Oitavas/quartas (×2): 5→10, 4→8.
    expect(within(tabela).getByText("10")).toBeInTheDocument();
    expect(within(tabela).getByText("8")).toBeInTheDocument();
    // "6" aparece duas vezes: 3×2 e 2×3.
    expect(within(tabela).getAllByText("6")).toHaveLength(2);
  });
});
