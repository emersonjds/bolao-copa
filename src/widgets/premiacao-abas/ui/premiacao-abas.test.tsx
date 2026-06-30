import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/premiacao", () => ({
  PremiacaoContent: () => <p>conteúdo-premiacao</p>,
}));
vi.mock("@/features/regras", () => ({
  RegrasContent: () => <p>conteúdo-regras</p>,
}));

import { PremiacaoAbas } from "./premiacao-abas";

describe("PremiacaoAbas", () => {
  it("renderiza o tablist com rótulo acessível e as duas abas", () => {
    render(<PremiacaoAbas />);
    expect(screen.getByRole("tablist", { name: "Premiação e regras" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Premiação" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Regras" })).toBeInTheDocument();
  });

  it("a aba Premiação está selecionada e Regras não ao montar", () => {
    render(<PremiacaoAbas />);
    expect(screen.getByRole("tab", { name: "Premiação" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Regras" })).toHaveAttribute("aria-selected", "false");
  });

  it("exibe PremiacaoContent e oculta RegrasContent na montagem inicial", () => {
    render(<PremiacaoAbas />);
    expect(screen.getByText("conteúdo-premiacao")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo-regras")).not.toBeInTheDocument();
  });

  it("ao clicar em Regras, exibe RegrasContent e remove PremiacaoContent", async () => {
    render(<PremiacaoAbas />);
    await userEvent.click(screen.getByRole("tab", { name: "Regras" }));
    expect(screen.getByText("conteúdo-regras")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo-premiacao")).not.toBeInTheDocument();
  });

  it("ao clicar em Regras, atualiza aria-selected nos dois botões", async () => {
    render(<PremiacaoAbas />);
    await userEvent.click(screen.getByRole("tab", { name: "Regras" }));
    expect(screen.getByRole("tab", { name: "Regras" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Premiação" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });

  it("clicar em Premiação após Regras restaura o conteúdo e o aria-selected", async () => {
    render(<PremiacaoAbas />);
    await userEvent.click(screen.getByRole("tab", { name: "Regras" }));
    await userEvent.click(screen.getByRole("tab", { name: "Premiação" }));
    expect(screen.getByText("conteúdo-premiacao")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo-regras")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Premiação" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Regras" })).toHaveAttribute("aria-selected", "false");
  });
});
