import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { server } from "@/test/msw/server";
import { restSingle, restError } from "@/test/msw/handlers";
import { createTestQueryClient, fakeUser } from "@/test/render";

// useIsAdmin lê o usuário via useSupabaseUser (Supabase direto) e busca o
// perfil via getSupabaseBrowserClient (real → interceptado pelo MSW). Por isso
// mockamos só useSupabaseUser, preservando o resto do módulo.
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

  it("retorna true quando o perfil tem is_admin = true", async () => {
    useSupabaseUser.mockReturnValue(fakeUser());
    server.use(restSingle("profiles", { is_admin: true }));

    const { result } = renderUseIsAdmin();
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("retorna false quando is_admin = false", async () => {
    useSupabaseUser.mockReturnValue(fakeUser());
    server.use(restSingle("profiles", { is_admin: false }));

    const { result } = renderUseIsAdmin();
    // Resolve a query e garante que continua false.
    await waitFor(() => expect(result.current).toBe(false));
    expect(result.current).toBe(false);
  });

  it("retorna false quando is_admin = null", async () => {
    useSupabaseUser.mockReturnValue(fakeUser());
    server.use(restSingle("profiles", { is_admin: null }));

    const { result } = renderUseIsAdmin();
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("retorna false quando a busca do perfil falha", async () => {
    useSupabaseUser.mockReturnValue(fakeUser());
    server.use(restError("profiles", { status: 403, code: "42501", message: "permission denied" }));

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
