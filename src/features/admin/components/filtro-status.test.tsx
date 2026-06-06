import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FiltroStatus } from "./filtro-status";

describe("FiltroStatus", () => {
  it("renderiza as duas abas com a ativa marcada por aria-selected", () => {
    render(<FiltroStatus value="pendentes" onChange={() => {}} />);

    const pendentes = screen.getByRole("tab", { name: "Pendentes" });
    const encerradas = screen.getByRole("tab", { name: "Encerradas" });

    expect(pendentes).toHaveAttribute("aria-selected", "true");
    expect(encerradas).toHaveAttribute("aria-selected", "false");
  });

  it("marca 'Encerradas' como ativa quando esse é o valor", () => {
    render(<FiltroStatus value="encerradas" onChange={() => {}} />);

    expect(screen.getByRole("tab", { name: "Encerradas" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Pendentes" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("chama onChange com o valor da aba clicada", async () => {
    const onChange = vi.fn();
    render(<FiltroStatus value="pendentes" onChange={onChange} />);

    await userEvent.click(screen.getByRole("tab", { name: "Encerradas" }));

    expect(onChange).toHaveBeenCalledWith("encerradas");
  });
});
