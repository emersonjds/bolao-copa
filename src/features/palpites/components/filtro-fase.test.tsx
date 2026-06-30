import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FaseCopa } from "@/entities/partida";
import { FiltroFase } from "./filtro-fase";

const fases: FaseCopa[] = ["grupos", "oitavas", "quartas"];

describe("FiltroFase", () => {
  it("renderiza um botão para cada fase recebida com o label correto", () => {
    render(<FiltroFase fases={fases} faseSelecionada="grupos" onSelect={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Fase de Grupos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Oitavas" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Quartas" })).toBeInTheDocument();
  });

  it("marca apenas a fase selecionada como aria-selected=true", () => {
    render(<FiltroFase fases={fases} faseSelecionada="oitavas" onSelect={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Oitavas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Fase de Grupos" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
    expect(screen.getByRole("tab", { name: "Quartas" })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onSelect com a fase correta ao clicar em um botão", async () => {
    const onSelect = vi.fn();
    render(<FiltroFase fases={fases} faseSelecionada="grupos" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("tab", { name: "Quartas" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("quartas");
  });
});
