import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LegendaGrupo } from "./legenda-grupo";

describe("LegendaGrupo", () => {
  it("mostra o estado provisório enquanto o grupo não terminou", () => {
    render(<LegendaGrupo finalizado={false} />);
    expect(screen.getByText("Avança")).toBeInTheDocument();
    expect(screen.getByText("Repescagem (prov.)")).toBeInTheDocument();
    expect(screen.queryByText("Classificado")).not.toBeInTheDocument();
  });

  it("mostra o status confirmado quando o grupo terminou", () => {
    render(<LegendaGrupo finalizado={true} />);
    expect(screen.getByText("Classificado")).toBeInTheDocument();
    expect(screen.getByText("Repescagem")).toBeInTheDocument();
    expect(screen.queryByText("Repescagem (prov.)")).not.toBeInTheDocument();
  });

  it("sempre mostra Eliminado", () => {
    const { rerender } = render(<LegendaGrupo finalizado={false} />);
    expect(screen.getByText("Eliminado")).toBeInTheDocument();
    rerender(<LegendaGrupo finalizado={true} />);
    expect(screen.getByText("Eliminado")).toBeInTheDocument();
  });
});
