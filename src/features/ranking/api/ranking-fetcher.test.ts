import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { rpc, rpcError } from "@/test/msw/handlers";
import { itemRankingRpc } from "@/test/fixtures";
import { listarRanking } from "./ranking-fetcher";

describe("listarRanking (integração Supabase via MSW)", () => {
  it("mapeia o ranking retornado pela RPC get_ranking", async () => {
    server.use(rpc("get_ranking", [itemRankingRpc]));

    const ranking = await listarRanking();

    expect(ranking).toEqual([
      {
        participanteId: "part-id-1",
        nome: "Tester",
        avatarUrl: null,
        pontosTotais: 12,
        jogosPontuados: 4,
      },
    ]);
  });

  it("retorna lista vazia quando não há participantes", async () => {
    server.use(rpc("get_ranking", []));
    expect(await listarRanking()).toEqual([]);
  });

  it("lança erro amigável quando a RPC falha (ex.: PGRST202)", async () => {
    server.use(rpcError("get_ranking", { status: 404, message: "Could not find the function" }));
    await expect(listarRanking()).rejects.toThrow(/Falha ao carregar ranking/);
  });
});
