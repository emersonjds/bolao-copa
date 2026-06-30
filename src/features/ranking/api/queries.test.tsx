import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { server } from "@/test/msw/server";
import { rpc, rpcError } from "@/test/msw/handlers";
import { itemRankingRpc, destaqueDiaRpc } from "@/test/fixtures";
import { createTestQueryClient } from "@/test/render";
import { useRanking, useDestaqueDia, rankingKeys, destaqueDiaKeys } from "./queries";

/** Cria um wrapper com QueryClient isolado por teste (sem cache vazando entre casos). */
function createWrapper() {
  const client = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Chaves de cache — pura lógica, sem rede
// ---------------------------------------------------------------------------

describe("rankingKeys", () => {
  it("retorna chave estática ['ranking']", () => {
    expect(rankingKeys.all).toEqual(["ranking"]);
  });
});

describe("destaqueDiaKeys", () => {
  it("ultimo() retorna ['destaque-dia'] sem dia", () => {
    expect(destaqueDiaKeys.ultimo()).toEqual(["destaque-dia"]);
  });

  it("porDia(d) inclui o dia na chave para cache separado", () => {
    expect(destaqueDiaKeys.porDia("2026-06-30")).toEqual(["destaque-dia", "2026-06-30"]);
  });
});

// ---------------------------------------------------------------------------
// useRanking — integração via MSW
// ---------------------------------------------------------------------------

describe("useRanking", () => {
  it("retorna dados mapeados em sucesso", async () => {
    server.use(rpc("get_ranking", [itemRankingRpc]));

    const { result } = renderHook(() => useRanking(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toEqual({
      participanteId: "part-id-1",
      nome: "Tester",
      avatarUrl: null,
      pontosTotais: 12,
      jogosPontuados: 4,
    });
  });

  it("retorna lista vazia quando a RPC não tem participantes", async () => {
    server.use(rpc("get_ranking", []));

    const { result } = renderHook(() => useRanking(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("expõe isError quando a RPC falha", async () => {
    server.use(rpcError("get_ranking", { status: 404, message: "Could not find the function" }));

    const { result } = renderHook(() => useRanking(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// useDestaqueDia — integração via MSW
// ---------------------------------------------------------------------------

describe("useDestaqueDia", () => {
  it("retorna destaque mapeado quando chamado sem dia (mais recente)", async () => {
    server.use(rpc("get_destaque_dia", [destaqueDiaRpc]));

    const { result } = renderHook(() => useDestaqueDia(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toEqual({
      dia: "2026-06-30",
      participanteId: "part-id-1",
      nome: "Tester",
      avatarUrl: null,
      pontosDia: 8,
    });
  });

  it("retorna destaque mapeado quando chamado com dia explícito", async () => {
    server.use(rpc("get_destaque_dia", [destaqueDiaRpc]));

    const { result } = renderHook(() => useDestaqueDia("2026-06-30"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].dia).toBe("2026-06-30");
  });

  it("retorna lista vazia quando não há destaque no dia", async () => {
    server.use(rpc("get_destaque_dia", []));

    const { result } = renderHook(() => useDestaqueDia(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("expõe isError quando a RPC falha", async () => {
    server.use(rpcError("get_destaque_dia", { status: 400 }));

    const { result } = renderHook(() => useDestaqueDia(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
