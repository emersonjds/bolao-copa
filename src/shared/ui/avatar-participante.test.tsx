import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AvatarParticipante } from "./avatar-participante";

describe("AvatarParticipante", () => {
  it("renderiza a imagem quando há avatarUrl", () => {
    render(<AvatarParticipante nome="João Silva" avatarUrl="https://x.test/a.png" />);
    const img = screen.getByRole("img", { name: "João Silva" });
    expect(img).toHaveAttribute("src", "https://x.test/a.png");
    expect(img).toHaveAttribute("width", "36");
    expect(img).toHaveAttribute("height", "36");
  });

  it("cai para iniciais quando a imagem falha", () => {
    render(<AvatarParticipante nome="João Silva" avatarUrl="https://x.test/a.png" />);
    fireEvent.error(screen.getByRole("img", { name: "João Silva" }));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it("mostra iniciais quando não há avatarUrl", () => {
    render(<AvatarParticipante nome="João Silva" />);
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it("trata avatarUrl null como ausente", () => {
    render(<AvatarParticipante nome="João Silva" avatarUrl={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("JS")).toBeInTheDocument();
  });

  it("usa a primeira letra para nome de uma só palavra", () => {
    render(<AvatarParticipante nome="Maria" />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("usa primeira + última inicial para nomes compostos", () => {
    render(<AvatarParticipante nome="Ana Beatriz Costa" />);
    expect(screen.getByText("AC")).toBeInTheDocument();
  });

  it("mostra '?' para nome vazio ou só espaços", () => {
    render(<AvatarParticipante nome="   " />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("aplica cor determinística por hash do nome", () => {
    // "AB" → 65+66 = 131; 131 % 4 = 3 → COLOR_OPTIONS[3]
    const { container } = render(<AvatarParticipante nome="AB" />);
    expect(container.querySelector("span")?.className).toContain("bg-secondary");
  });

  it("mesma cor para o mesmo nome (determinístico)", () => {
    const { container: a } = render(<AvatarParticipante nome="Carlos" />);
    const { container: b } = render(<AvatarParticipante nome="Carlos" />);
    const classA = a.querySelector("span")?.className;
    const classB = b.querySelector("span")?.className;
    expect(classA).toBe(classB);
  });

  it("calcula fontSize a partir do tamanho (38%)", () => {
    render(<AvatarParticipante nome="Maria" tamanho={50} />);
    // round(50 * 0.38) = 19
    expect(screen.getByText("M")).toHaveStyle({ fontSize: "19px" });
  });

  it("aplica className extra nas iniciais", () => {
    render(<AvatarParticipante nome="Maria" className="ring-2" />);
    expect(screen.getByText("M").className).toContain("ring-2");
  });

  it("aplica className extra na imagem", () => {
    render(<AvatarParticipante nome="Maria" avatarUrl="https://x.test/a.png" className="ring-2" />);
    expect(screen.getByRole("img").className).toContain("ring-2");
  });
});
