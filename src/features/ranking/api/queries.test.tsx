import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { server } from "@/test/msw/server";
import { rpc, rpcError } from "@/test/msw/handlers";
import { itemRankingRpc, destaqueRodadaRpc } from "@/test/fixtures";
import { createTestQueryClient } from "@/test/render";
import { useRanking, useDestaqueRodada, rankingKeys, destaqueRodadaKeys } from "./queries";

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

describe("destaqueRodadaKeys", () => {
  it("ultima() retorna ['destaque-rodada'] sem rodada", () => {
    expect(destaqueRodadaKeys.ultima()).toEqual(["destaque-rodada"]);
  });

  it("porRodada(n) inclui a rodada na chave para cache separado", () => {
    expect(destaqueRodadaKeys.porRodada(3)).toEqual(["destaque-rodada", 3]);
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
// useDestaqueRodada — integração via MSW
// ---------------------------------------------------------------------------

describe("useDestaqueRodada", () => {
  it("retorna destaque mapeado quando chamado sem rodada (última apurada)", async () => {
    server.use(rpc("get_destaque_rodada", [destaqueRodadaRpc]));

    const { result } = renderHook(() => useDestaqueRodada(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0]).toEqual({
      rodada: 1,
      participanteId: "part-id-1",
      nome: "Tester",
      avatarUrl: null,
      pontosRodada: 8,
    });
  });

  it("retorna destaque mapeado quando chamado com rodada explícita", async () => {
    server.use(rpc("get_destaque_rodada", [destaqueRodadaRpc]));

    const { result } = renderHook(() => useDestaqueRodada(1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].rodada).toBe(1);
  });

  it("retorna lista vazia quando não há destaque na rodada", async () => {
    server.use(rpc("get_destaque_rodada", []));

    const { result } = renderHook(() => useDestaqueRodada(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("expõe isError quando a RPC falha", async () => {
    server.use(rpcError("get_destaque_rodada", { status: 400 }));

    const { result } = renderHook(() => useDestaqueRodada(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
