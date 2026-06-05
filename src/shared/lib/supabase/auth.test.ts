import { describe, expect, it, vi, beforeEach } from "vitest";

const signInWithOAuth = vi.fn();
const signOut = vi.fn();

vi.mock("./client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { signInWithOAuth, signOut } }),
}));

import { signInWithGoogle, signOutUser } from "./auth";

describe("auth helpers", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signOut.mockReset();
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
});
