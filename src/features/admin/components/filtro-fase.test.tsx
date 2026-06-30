import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FiltroFase } from "./filtro-fase";
import type { FaseCopa } from "@/entities/partida";

describe("FiltroFase", () => {
  it("não renderiza nada quando não há fases", () => {
    const { container } = render(<FiltroFase fases={[]} value="todas" onChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("não renderiza nada com uma única fase (filtro não agrega valor)", () => {
    const { container } = render(
      <FiltroFase fases={["grupos"]} value="todas" onChange={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza 'Todas' + chips quando há duas ou mais fases", () => {
    render(<FiltroFase fases={["grupos", "oitavas"]} value="todas" onChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Grupos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Oitavas" })).toBeInTheDocument();
  });

  it("ordena as fases na ordem canônica, independente da ordem de entrada", () => {
    const fases: FaseCopa[] = ["final", "grupos"];
    render(<FiltroFase fases={fases} value="todas" onChange={() => {}} />);

    const labels = screen.getAllByRole("button").map((b) => b.textContent);
    expect(labels).toEqual(["Todas", "Grupos", "Final"]);
  });

  it("destaca o chip ativo correspondente ao value", () => {
    render(<FiltroFase fases={["grupos", "final"]} value="grupos" onChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Grupos" })).toHaveClass("bg-brand-800");
    expect(screen.getByRole("button", { name: "Todas" })).not.toHaveClass("bg-brand-800");
  });

  it("chama onChange com a fase clicada e com 'todas'", async () => {
    const onChange = vi.fn();
    render(<FiltroFase fases={["grupos", "final"]} value="todas" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Final" }));
    expect(onChange).toHaveBeenCalledWith("final");

    await userEvent.click(screen.getByRole("button", { name: "Todas" }));
    expect(onChange).toHaveBeenCalledWith("todas");
  });
});
