import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";

const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
const unsubscribe = vi.fn();
let authCallback: ((event: string, session: Session | null) => void) | undefined;
const onAuthStateChange = vi.fn((cb: (event: string, session: Session | null) => void) => {
  authCallback = cb;
  return { data: { subscription: { unsubscribe } } };
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

function renderProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  it("começa carregando e resolve para deslogado sem sessão", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    expect(getSession).toHaveBeenCalled();
    expect(onAuthStateChange).toHaveBeenCalled();
  });

  it("passa a logado quando o onAuthStateChange emite uma sessão", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());

    const session = { user: { id: "u1" } } as Session;
    act(() => authCallback?.("SIGNED_IN", session));

    expect(screen.getByText("logado")).toBeInTheDocument();
  });

  it("volta a deslogado quando a sessão é null no onAuthStateChange (logout)", async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());

    act(() => authCallback?.("SIGNED_OUT", null));
    expect(screen.getByText("deslogado")).toBeInTheDocument();
  });

  it("cancela a inscrição (unsubscribe) ao desmontar", async () => {
    const { unmount } = renderProvider();
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
