import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const signInWithOAuth = vi.fn();
const signOut = vi.fn();
const signInWithPassword = vi.fn();

vi.mock("./client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { signInWithOAuth, signOut, signInWithPassword } }),
}));

import { signInWithGoogle, signInDev, signOutUser } from "./auth";

describe("auth helpers", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signOut.mockReset();
    signInWithPassword.mockReset();
    vi.stubGlobal("window", { location: { origin: "https://app.test" } });
  });

  it("chama signInWithOAuth com provider google e redirect para /auth/callback", async () => {
    await signInWithGoogle();
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://app.test/auth/callback" },
    });
  });

  it("encaminha o destino pós-login via query next", async () => {
    await signInWithGoogle("/palpites");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://app.test/auth/callback?next=%2Fpalpites" },
    });
  });

  it("signOutUser chama supabase.auth.signOut", async () => {
    await signOutUser();
    expect(signOut).toHaveBeenCalledOnce();
  });

  describe("signInDev", () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("chama signInWithPassword com email e senha em ambiente não-produção", async () => {
      signInWithPassword.mockResolvedValue({ error: null });
      await signInDev("dev@bolao.test", "Senha-Demo-2026!");
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "dev@bolao.test",
        password: "Senha-Demo-2026!",
      });
    });

    it("propaga o erro retornado pelo Supabase", async () => {
      const err = new Error("credenciais inválidas");
      signInWithPassword.mockResolvedValue({ error: err });
      await expect(signInDev("dev@bolao.test", "errada")).rejects.toThrow("credenciais inválidas");
    });

    it("lança erro ao ser chamado quando NODE_ENV === 'production'", async () => {
      vi.stubEnv("NODE_ENV", "production");
      await expect(signInDev("x@x.com", "y")).rejects.toThrow("signInDev indisponível em produção");
      expect(signInWithPassword).not.toHaveBeenCalled();
    });
  });
});
