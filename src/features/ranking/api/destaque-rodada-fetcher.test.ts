import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { rpc, rpcError } from "@/test/msw/handlers";
import { destaqueRodadaRpc } from "@/test/fixtures";
import { listarDestaqueRodada } from "./destaque-rodada-fetcher";

describe("listarDestaqueRodada (integração Supabase via MSW)", () => {
  it("mapeia o destaque retornado pela RPC com rodada explícita", async () => {
    server.use(rpc("get_destaque_rodada", [destaqueRodadaRpc]));

    const resultado = await listarDestaqueRodada(1);

    expect(resultado).toEqual([
      {
        rodada: 1,
        participanteId: "part-id-1",
        nome: "Tester",
        avatarUrl: null,
        pontosRodada: 8,
      },
    ]);
  });

  it("funciona sem rodada explícita (usa última rodada apurada — parâmetro omitido)", async () => {
    server.use(rpc("get_destaque_rodada", [destaqueRodadaRpc]));

    const resultado = await listarDestaqueRodada();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].participanteId).toBe("part-id-1");
    expect(resultado[0].rodada).toBe(1);
  });

  it("retorna lista vazia quando não há destaque na rodada", async () => {
    server.use(rpc("get_destaque_rodada", []));

    expect(await listarDestaqueRodada()).toEqual([]);
  });

  it("retorna múltiplos destaques em caso de empate na liderança da rodada", async () => {
    const rival = {
      ...destaqueRodadaRpc,
      participante_id: "part-id-2",
      nome: "Rival",
      pontos_rodada: 8,
    };
    server.use(rpc("get_destaque_rodada", [destaqueRodadaRpc, rival]));

    const resultado = await listarDestaqueRodada(1);

    expect(resultado).toHaveLength(2);
    expect(resultado[0].participanteId).toBe("part-id-1");
    expect(resultado[1].participanteId).toBe("part-id-2");
    expect(resultado[1].nome).toBe("Rival");
    // Ambos com os mesmos pontos da rodada (empate)
    expect(resultado[0].pontosRodada).toBe(resultado[1].pontosRodada);
  });

  it("lança erro amigável quando a RPC falha (ex.: PGRST202 função inexistente)", async () => {
    server.use(
      rpcError("get_destaque_rodada", {
        status: 404,
        message: "Could not find the function",
      })
    );

    await expect(listarDestaqueRodada()).rejects.toThrow(/Falha ao carregar destaque da rodada/);
  });

  it("lança erro amigável para falha genérica de banco (status 400)", async () => {
    server.use(rpcError("get_destaque_rodada", { status: 400, message: "permission denied" }));

    await expect(listarDestaqueRodada(2)).rejects.toThrow(/Falha ao carregar destaque da rodada/);
  });
});
