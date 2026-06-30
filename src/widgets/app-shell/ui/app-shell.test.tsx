import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, fakeUser } from "@/test/render";

// A AppShell compõe TopBar + BottomNav, que tocam useIsAdmin/usePathname.
const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn<() => string>() }));
vi.mock("next/navigation", () => ({ usePathname }));

const { useIsAdmin } = vi.hoisted(() => ({ useIsAdmin: vi.fn<() => boolean>() }));
vi.mock("@/features/auth/use-is-admin", () => ({ useIsAdmin }));
vi.mock("@/shared/lib/supabase", () => ({ signOutUser: vi.fn().mockResolvedValue(undefined) }));
// O gate de novidades tem testes próprios; aqui isolamos a AppShell dele.
vi.mock("@/features/novidades", () => ({ NovidadesGate: () => null }));

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
    useIsAdmin.mockReturnValue(false);
  });

  it("renderiza o conteúdo (children) na área principal", () => {
    renderWithProviders(
      <AppShell>
        <p>Conteúdo da página</p>
      </AppShell>,
      { user: null }
    );
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("renderiza a barra superior e a navegação inferior", () => {
    renderWithProviders(
      <AppShell>
        <p>Página</p>
      </AppShell>,
      { user: fakeUser() }
    );
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Resenha - Bolão da Copa")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: /navegação principal/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /menu do usuário/i })).toBeInTheDocument();
  });
});
