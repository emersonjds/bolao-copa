import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BotaoSalvar } from "./botao-salvar";

describe("BotaoSalvar", () => {
  it("não renderiza nada sem pendências e sem estar salvando", () => {
    const { container } = render(
      <BotaoSalvar hasPendingChanges={false} isSaving={false} onSalvar={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("aparece com pendências e dispara onSalvar ao clicar", async () => {
    const onSalvar = vi.fn();
    render(<BotaoSalvar hasPendingChanges isSaving={false} onSalvar={onSalvar} />);

    await userEvent.click(screen.getByRole("button", { name: "Salvar palpites" }));

    expect(onSalvar).toHaveBeenCalledOnce();
  });

  it("mostra 'Salvando...' e fica desabilitado durante o salvamento", () => {
    render(<BotaoSalvar hasPendingChanges isSaving onSalvar={() => {}} />);
    const botao = screen.getByRole("button", { name: /salvando/i });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("aria-busy", "true");
  });
});
