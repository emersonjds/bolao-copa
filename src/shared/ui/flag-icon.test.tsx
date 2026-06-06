import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlagIcon } from "./flag-icon";

describe("FlagIcon", () => {
  it("exibe a bandeira do flagcdn para um código conhecido", () => {
    const { container } = render(<FlagIcon codigoFifa="BRA" nome="Brasil" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://flagcdn.com/br.svg");
    expect(screen.getByRole("img", { name: "Brasil" })).toBeInTheDocument();
  });

  it("usa rótulo padrão 'Seleção a definir' sem nome", () => {
    render(<FlagIcon codigoFifa="BRA" />);
    expect(screen.getByRole("img", { name: "Seleção a definir" })).toBeInTheDocument();
  });

  it("mostra o escudo (sem img) para código desconhecido", () => {
    const { container } = render(<FlagIcon codigoFifa="ZZZ" nome="Desconhecida" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("mostra o escudo quando o código é ausente (null)", () => {
    const { container } = render(<FlagIcon codigoFifa={null} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("cai para o escudo quando a imagem falha ao carregar", () => {
    const { container } = render(<FlagIcon codigoFifa="BRA" nome="Brasil" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img!);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("aplica a classe de tamanho correta (sm/md/lg)", () => {
    const { container: sm } = render(<FlagIcon codigoFifa="BRA" tamanho="sm" />);
    expect(sm.querySelector('[role="img"]')?.className).toContain("h-6");

    const { container: md } = render(<FlagIcon codigoFifa="BRA" tamanho="md" />);
    expect(md.querySelector('[role="img"]')?.className).toContain("h-8");

    const { container: lg } = render(<FlagIcon codigoFifa="BRA" tamanho="lg" />);
    expect(lg.querySelector('[role="img"]')?.className).toContain("h-10");
  });

  it("usa tamanho md por padrão", () => {
    const { container } = render(<FlagIcon codigoFifa="BRA" />);
    expect(container.querySelector('[role="img"]')?.className).toContain("h-8");
  });
});
