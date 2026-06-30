import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/calendario", () => ({
  CalendarioContent: () => <p>conteúdo-agenda</p>,
}));
vi.mock("@/features/grupos", () => ({
  GruposContent: () => <p>conteúdo-grupos</p>,
}));

import { CalendarioAbas } from "./calendario-abas";

describe("CalendarioAbas", () => {
  it("renderiza o tablist com rótulo acessível e as duas abas", () => {
    render(<CalendarioAbas />);
    expect(screen.getByRole("tablist", { name: "Visualização da Copa" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agenda" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Grupos" })).toBeInTheDocument();
  });

  it("a aba Agenda está selecionada e Grupos não ao montar", () => {
    render(<CalendarioAbas />);
    expect(screen.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Grupos" })).toHaveAttribute("aria-selected", "false");
  });

  it("exibe CalendarioContent e oculta GruposContent na montagem inicial", () => {
    render(<CalendarioAbas />);
    expect(screen.getByText("conteúdo-agenda")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo-grupos")).not.toBeInTheDocument();
  });

  it("ao clicar em Grupos, exibe GruposContent e remove CalendarioContent", async () => {
    render(<CalendarioAbas />);
    await userEvent.click(screen.getByRole("tab", { name: "Grupos" }));
    expect(screen.getByText("conteúdo-grupos")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo-agenda")).not.toBeInTheDocument();
  });

  it("ao clicar em Grupos, atualiza aria-selected nos dois botões", async () => {
    render(<CalendarioAbas />);
    await userEvent.click(screen.getByRole("tab", { name: "Grupos" }));
    expect(screen.getByRole("tab", { name: "Grupos" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-selected", "false");
  });

  it("clicar em Agenda após Grupos restaura o conteúdo e o aria-selected", async () => {
    render(<CalendarioAbas />);
    await userEvent.click(screen.getByRole("tab", { name: "Grupos" }));
    await userEvent.click(screen.getByRole("tab", { name: "Agenda" }));
    expect(screen.getByText("conteúdo-agenda")).toBeInTheDocument();
    expect(screen.queryByText("conteúdo-grupos")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Agenda" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Grupos" })).toHaveAttribute("aria-selected", "false");
  });
});
