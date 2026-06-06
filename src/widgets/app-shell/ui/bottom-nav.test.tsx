import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn<() => string>() }));
vi.mock("next/navigation", () => ({ usePathname }));

// useIsAdmin é re-exportado por "@/features/auth"; mockando o arquivo-folha
// cobrimos o consumo via index.
const { useIsAdmin } = vi.hoisted(() => ({ useIsAdmin: vi.fn<() => boolean>() }));
vi.mock("@/features/auth/use-is-admin", () => ({ useIsAdmin }));

import { BottomNav } from "./bottom-nav";

describe("BottomNav", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
    useIsAdmin.mockReturnValue(false);
  });

  it("renderiza as quatro abas base", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /início/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /palpites/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ranking/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /regras/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /admin/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("exibe a aba Admin quando o usuário é admin", () => {
    useIsAdmin.mockReturnValue(true);
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /admin/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });

  it("marca a aba Início como ativa na raiz", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /início/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /palpites/i })).not.toHaveAttribute("aria-current");
  });

  it("marca a aba por prefixo de rota (startsWith)", () => {
    usePathname.mockReturnValue("/palpites/123");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /palpites/i })).toHaveAttribute("aria-current", "page");
  });

  it("não marca Início quando a rota não é exatamente a raiz", () => {
    usePathname.mockReturnValue("/ranking");
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /início/i })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: /ranking/i })).toHaveAttribute("aria-current", "page");
  });

  it("expõe a navegação com rótulo acessível", () => {
    render(<BottomNav />);
    expect(screen.getByRole("navigation", { name: /navegação principal/i })).toBeInTheDocument();
  });
});
