import { describe, it, expect, vi, beforeEach } from "vitest";
import { type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { createTestQueryClient, fakeUser } from "@/test/render";
import { server } from "@/test/msw/server";
import { restSingle, restError } from "@/test/msw/handlers";

const state = vi.hoisted(() => ({ user: null as User | null }));

vi.mock("./use-user", () => ({
  useSupabaseUser: () => state.user,
}));

import { useMeuParticipanteId } from "./use-participante";

function wrapper({ children }: { children: ReactNode }) {
  const client = createTestQueryClient();
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  state.user = null;
});

describe("useMeuParticipanteId", () => {
  it("retorna o participante_id do usuário logado", async () => {
    state.user = fakeUser();
    server.use(restSingle("participantes", { id: "part-id-1" }));

    const { result } = renderHook(() => useMeuParticipanteId(), { wrapper });

    await waitFor(() => expect(result.current).toBe("part-id-1"));
  });

  it("retorna null quando não há usuário (query desabilitada)", () => {
    state.user = null;
    const { result } = renderHook(() => useMeuParticipanteId(), { wrapper });
    expect(result.current).toBeNull();
  });

  it("retorna null quando a consulta falha", async () => {
    state.user = fakeUser();
    server.use(restError("participantes", { status: 400, code: "42501", message: "RLS" }));

    const { result } = renderHook(() => useMeuParticipanteId(), { wrapper });

    // valor permanece null mesmo após a tentativa de fetch
    await waitFor(() => expect(result.current).toBeNull());
  });

  it("retorna null quando não encontra a linha", async () => {
    state.user = fakeUser();
    server.use(restSingle("participantes", null));

    const { result } = renderHook(() => useMeuParticipanteId(), { wrapper });

    await waitFor(() => expect(result.current).toBeNull());
  });
});
