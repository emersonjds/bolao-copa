import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, fakeUser } from "@/test/render";

// A TopBar embute o UserMenu, que usa useIsAdmin (Supabase) e signOutUser.
const { useIsAdmin } = vi.hoisted(() => ({ useIsAdmin: vi.fn<() => boolean>() }));
vi.mock("@/features/auth/use-is-admin", () => ({ useIsAdmin }));
vi.mock("@/shared/lib/supabase", () => ({ signOutUser: vi.fn().mockResolvedValue(undefined) }));

import { TopBar } from "./top-bar";

describe("TopBar", () => {
  beforeEach(() => {
    useIsAdmin.mockReturnValue(false);
  });

  it("exibe a marca do bolão", () => {
    renderWithProviders(<TopBar />, { user: null });
    expect(screen.getByText("Resenha - Bolão da Copa")).toBeInTheDocument();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("não mostra o menu do usuário quando deslogado", () => {
    renderWithProviders(<TopBar />, { user: null });
    expect(screen.queryByRole("button", { name: /menu do usuário/i })).not.toBeInTheDocument();
  });

  it("mostra o menu do usuário quando logado", () => {
    renderWithProviders(<TopBar />, { user: fakeUser() });
    expect(screen.getByRole("button", { name: /menu do usuário/i })).toBeInTheDocument();
  });
});
