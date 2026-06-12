import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModalNovidades } from "./modal-novidades";
import { AVISO_ATUAL } from "../model/aviso-atual";

describe("ModalNovidades", () => {
  it("mostra o título e cada novidade do aviso", () => {
    render(<ModalNovidades aviso={AVISO_ATUAL} onFechar={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(AVISO_ATUAL.titulo)).toBeInTheDocument();
    for (const item of AVISO_ATUAL.itens) {
      expect(screen.getByText(item.titulo)).toBeInTheDocument();
    }
  });

  it("dispara onFechar no botão 'Bora!'", async () => {
    const onFechar = vi.fn();
    render(<ModalNovidades aviso={AVISO_ATUAL} onFechar={onFechar} />);
    await userEvent.click(screen.getByRole("button", { name: /bora!/i }));
    expect(onFechar).toHaveBeenCalledOnce();
  });

  it("dispara onFechar ao pressionar Escape", async () => {
    const onFechar = vi.fn();
    render(<ModalNovidades aviso={AVISO_ATUAL} onFechar={onFechar} />);
    await userEvent.keyboard("{Escape}");
    expect(onFechar).toHaveBeenCalledOnce();
  });
});
