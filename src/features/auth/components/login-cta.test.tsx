import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { signInWithGoogle } = vi.hoisted(() => ({ signInWithGoogle: vi.fn() }));
vi.mock("@/shared/lib/supabase", () => ({ signInWithGoogle }));

import { LoginCTA } from "./login-cta";

describe("LoginCTA", () => {
  it("mostra o botão e chama signInWithGoogle com o next ao clicar", async () => {
    render(<LoginCTA next="/palpites" />);
    const botao = screen.getByRole("button", { name: /entrar com google/i });
    await userEvent.click(botao);
    expect(signInWithGoogle).toHaveBeenCalledWith("/palpites");
  });
});
