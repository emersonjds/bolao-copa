import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModalConfirmarAntecipado } from "./modal-confirmar-antecipado";

describe("ModalConfirmarAntecipado", () => {
  it("explica que o antecipado vale e é ajustável", () => {
    render(<ModalConfirmarAntecipado onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/usados quando o jogo começar/i)).toBeInTheDocument();
    expect(screen.getByText(/até o apito inicial/i)).toBeInTheDocument();
  });

  it("usa botões com altura confortável de toque (h-14)", () => {
    render(<ModalConfirmarAntecipado onConfirmar={() => {}} onCancelar={() => {}} />);
    expect(screen.getByRole("button", { name: /entendi, salvar/i })).toHaveClass("h-14");
    expect(screen.getByRole("button", { name: /voltar/i })).toHaveClass("h-14");
  });

  it("dispara onConfirmar no botão 'Entendi, salvar'", async () => {
    const onConfirmar = vi.fn();
    render(<ModalConfirmarAntecipado onConfirmar={onConfirmar} onCancelar={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /entendi, salvar/i }));
    expect(onConfirmar).toHaveBeenCalledOnce();
  });

  it("dispara onCancelar no botão 'Voltar'", async () => {
    const onCancelar = vi.fn();
    render(<ModalConfirmarAntecipado onConfirmar={() => {}} onCancelar={onCancelar} />);
    await userEvent.click(screen.getByRole("button", { name: /voltar/i }));
    expect(onCancelar).toHaveBeenCalledOnce();
  });

  it("dispara onCancelar ao pressionar Escape", async () => {
    const onCancelar = vi.fn();
    render(<ModalConfirmarAntecipado onConfirmar={() => {}} onCancelar={onCancelar} />);
    await userEvent.keyboard("{Escape}");
    expect(onCancelar).toHaveBeenCalledOnce();
  });
});
