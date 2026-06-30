import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeletorVista } from "./seletor-vista";

describe("SeletorVista", () => {
  it("renderiza as duas abas: Palpitar e Histórico", () => {
    render(<SeletorVista vista="palpitar" onSelect={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Palpitar" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Histórico" })).toBeInTheDocument();
  });

  it("marca a aba 'palpitar' como selecionada quando vista='palpitar'", () => {
    render(<SeletorVista vista="palpitar" onSelect={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Palpitar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Histórico" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("marca a aba 'historico' como selecionada quando vista='historico'", () => {
    render(<SeletorVista vista="historico" onSelect={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Histórico" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Palpitar" })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onSelect com 'historico' ao clicar na aba Histórico", async () => {
    const onSelect = vi.fn();
    render(<SeletorVista vista="palpitar" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("tab", { name: "Histórico" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("historico");
  });

  it("chama onSelect com 'palpitar' ao clicar na aba Palpitar", async () => {
    const onSelect = vi.fn();
    render(<SeletorVista vista="historico" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("tab", { name: "Palpitar" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith("palpitar");
  });
});
