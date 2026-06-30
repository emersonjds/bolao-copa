import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { server } from "@/test/msw/server";
import { rpc, rpcError } from "@/test/msw/handlers";
import { createTestQueryClient, fakeUser } from "@/test/render";

// useIsAdmin lê o usuário via useSupabaseUser e chama a RPC eh_admin (real →
// interceptada pelo MSW). Mockamos só useSupabaseUser, preservando o resto.
const { useSupabaseUser } = vi.hoisted(() => ({ useSupabaseUser: vi.fn<() => User | null>() }));
vi.mock("@/shared/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/supabase")>();
  return { ...actual, useSupabaseUser };
});

import { useIsAdmin } from "./use-is-admin";

function renderUseIsAdmin() {
  const client = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return renderHook(() => useIsAdmin(), { wrapper: Wrapper });
}

describe("useIsAdmin", () => {
  beforeEach(() => {
    useSupabaseUser.mockReset();
  });

  it("retorna true quando eh_admin retorna true", async () => {
    useSupabaseUser.mockReturnValue(fakeUser());
    server.use(rpc("eh_admin", true));

    const { result } = renderUseIsAdmin();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("retorna false quando eh_admin retorna false", async () => {
    useSupabaseUser.mockReturnValue(fakeUser());
    server.use(rpc("eh_admin", false));

    const { result } = renderUseIsAdmin();
    await waitFor(() => expect(result.current).toBe(false));
    expect(result.current).toBe(false);
  });

  it("retorna false quando a RPC falha", async () => {
    useSupabaseUser.mockReturnValue(fakeUser());
    server.use(rpcError("eh_admin", { status: 403, message: "permission denied" }));

    const { result } = renderUseIsAdmin();
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("retorna false e não consulta a rede sem usuário logado", () => {
    useSupabaseUser.mockReturnValue(null);
    // Sem server.use(...): qualquer requisição falharia (onUnhandledRequest: error).
    const { result } = renderUseIsAdmin();
    expect(result.current).toBe(false);
  });
});
