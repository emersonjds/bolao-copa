import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, fakeUser } from "@/test/render";

// useIsAdmin bate no Supabase; aqui controlamos seu retorno. O mesmo módulo é
// usado pelo UserMenu via "../use-is-admin" (resolve para o mesmo arquivo).
const { useIsAdmin } = vi.hoisted(() => ({ useIsAdmin: vi.fn<() => boolean>() }));
vi.mock("@/features/auth/use-is-admin", () => ({ useIsAdmin }));

const { signOutUser } = vi.hoisted(() => ({ signOutUser: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/shared/lib/supabase", () => ({ signOutUser }));

import { UserMenu } from "./user-menu";

describe("UserMenu", () => {
  beforeEach(() => {
    useIsAdmin.mockReturnValue(false);
    signOutUser.mockClear();
  });

  it("não renderiza nada quando não há usuário logado", () => {
    const { container } = renderWithProviders(<UserMenu />, { user: null });
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o gatilho do menu com o nome do usuário", () => {
    renderWithProviders(<UserMenu />, { user: fakeUser() });
    const trigger = screen.getByRole("button", { name: /menu do usuário — tester/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Menu fechado por padrão.
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("abre o dropdown com nome e botão de sair ao clicar", async () => {
    renderWithProviders(<UserMenu />, { user: fakeUser() });
    await userEvent.click(screen.getByRole("button", { name: /menu do usuário/i }));

    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /menu do usuário/i })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByRole("menuitem", { name: /sair/i })).toBeInTheDocument();
  });

  it("alterna (fecha) o dropdown ao clicar de novo no gatilho", async () => {
    renderWithProviders(<UserMenu />, { user: fakeUser() });
    const trigger = screen.getByRole("button", { name: /menu do usuário/i });
    await userEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.click(trigger);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("chama signOutUser e fecha o menu ao clicar em Sair", async () => {
    renderWithProviders(<UserMenu />, { user: fakeUser() });
    await userEvent.click(screen.getByRole("button", { name: /menu do usuário/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /sair/i }));

    expect(signOutUser).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("exibe a badge de Admin quando o usuário é admin", async () => {
    useIsAdmin.mockReturnValue(true);
    renderWithProviders(<UserMenu />, { user: fakeUser() });
    await userEvent.click(screen.getByRole("button", { name: /menu do usuário/i }));
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("não exibe a badge de Admin para usuário comum", async () => {
    useIsAdmin.mockReturnValue(false);
    renderWithProviders(<UserMenu />, { user: fakeUser() });
    await userEvent.click(screen.getByRole("button", { name: /menu do usuário/i }));
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("fecha o menu ao pressionar Escape", async () => {
    renderWithProviders(<UserMenu />, { user: fakeUser() });
    await userEvent.click(screen.getByRole("button", { name: /menu do usuário/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("fecha o menu ao clicar fora", async () => {
    renderWithProviders(
      <div>
        <UserMenu />
        <button type="button">fora</button>
      </div>,
      { user: fakeUser() }
    );
    await userEvent.click(screen.getByRole("button", { name: /menu do usuário/i }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "fora" }));
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  describe("nome de exibição", () => {
    it("usa full_name quando disponível", () => {
      renderWithProviders(<UserMenu />, {
        user: fakeUser({ user_metadata: { full_name: "João Silva" } }),
      });
      expect(
        screen.getByRole("button", { name: /menu do usuário — joão silva/i })
      ).toBeInTheDocument();
    });

    it("cai para name quando não há full_name", () => {
      renderWithProviders(<UserMenu />, {
        user: fakeUser({ user_metadata: { name: "Maria" } }),
      });
      expect(screen.getByRole("button", { name: /menu do usuário — maria/i })).toBeInTheDocument();
    });

    it("cai para o email quando não há nome", () => {
      renderWithProviders(<UserMenu />, {
        user: fakeUser({ user_metadata: {}, email: "ze@bolao.test" }),
      });
      expect(
        screen.getByRole("button", { name: /menu do usuário — ze@bolao\.test/i })
      ).toBeInTheDocument();
    });

    it("usa 'Usuário' quando não há nome nem email", () => {
      renderWithProviders(<UserMenu />, {
        user: fakeUser({ user_metadata: {}, email: undefined }),
      });
      expect(
        screen.getByRole("button", { name: /menu do usuário — usuário/i })
      ).toBeInTheDocument();
    });
  });

  describe("avatar", () => {
    it("renderiza a imagem de avatar_url quando presente", () => {
      renderWithProviders(<UserMenu />, {
        user: fakeUser({ user_metadata: { full_name: "Foto", avatar_url: "https://img/a.png" } }),
      });
      const img = screen.getByRole("img", { name: "Foto" });
      expect(img).toHaveAttribute("src", "https://img/a.png");
    });

    it("cai para picture quando não há avatar_url", () => {
      renderWithProviders(<UserMenu />, {
        user: fakeUser({ user_metadata: { full_name: "Pic", picture: "https://img/p.png" } }),
      });
      const img = screen.getByRole("img", { name: "Pic" });
      expect(img).toHaveAttribute("src", "https://img/p.png");
    });

    it("mostra iniciais quando não há imagem", () => {
      renderWithProviders(<UserMenu />, {
        user: fakeUser({ user_metadata: { full_name: "Ana Lima" } }),
      });
      // Sem <img>; o avatar de iniciais usa aria-label com o nome.
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
      expect(screen.getByText("AL")).toBeInTheDocument();
    });
  });
});
