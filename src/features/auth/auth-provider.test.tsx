import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
const onAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

vi.mock("@/shared/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: { getSession, onAuthStateChange } }),
}));

import { AuthProvider } from "./auth-provider";
import { useAuth } from "./use-auth";

function Probe() {
  const { loading, user } = useAuth();
  return <span>{loading ? "carregando" : user ? "logado" : "deslogado"}</span>;
}

describe("AuthProvider", () => {
  it("começa carregando e resolve para deslogado sem sessão", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    expect(getSession).toHaveBeenCalledOnce();
    expect(onAuthStateChange).toHaveBeenCalledOnce();
  });
});
