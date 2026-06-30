import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { rpc, rpcError } from "@/test/msw/handlers";
import { destaqueDiaRpc } from "@/test/fixtures";
import { listarDestaqueDia } from "./destaque-dia-fetcher";

describe("listarDestaqueDia (integração Supabase via MSW)", () => {
  it("mapeia o destaque retornado pela RPC com dia explícito", async () => {
    server.use(rpc("get_destaque_dia", [destaqueDiaRpc]));

    const resultado = await listarDestaqueDia("2026-06-30");

    expect(resultado).toEqual([
      {
        dia: "2026-06-30",
        participanteId: "part-id-1",
        nome: "Tester",
        avatarUrl: null,
        pontosDia: 8,
      },
    ]);
  });

  it("funciona sem dia explícito (usa o dia mais recente — parâmetro omitido)", async () => {
    server.use(rpc("get_destaque_dia", [destaqueDiaRpc]));

    const resultado = await listarDestaqueDia();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].participanteId).toBe("part-id-1");
    expect(resultado[0].dia).toBe("2026-06-30");
  });

  it("retorna lista vazia quando não há destaque no dia", async () => {
    server.use(rpc("get_destaque_dia", []));

    expect(await listarDestaqueDia()).toEqual([]);
  });

  it("retorna múltiplos destaques em caso de empate na liderança do dia", async () => {
    const rival = {
      ...destaqueDiaRpc,
      participante_id: "part-id-2",
      nome: "Rival",
      pontos_dia: 8,
    };
    server.use(rpc("get_destaque_dia", [destaqueDiaRpc, rival]));

    const resultado = await listarDestaqueDia("2026-06-30");

    expect(resultado).toHaveLength(2);
    expect(resultado[0].participanteId).toBe("part-id-1");
    expect(resultado[1].nome).toBe("Rival");
    expect(resultado[0].pontosDia).toBe(resultado[1].pontosDia);
  });

  it("lança erro amigável quando a RPC falha (ex.: PGRST202 função inexistente)", async () => {
    server.use(
      rpcError("get_destaque_dia", {
        status: 404,
        message: "Could not find the function",
      })
    );

    await expect(listarDestaqueDia()).rejects.toThrow(/Falha ao carregar craque do dia/);
  });

  it("lança erro amigável para falha genérica de banco (status 400)", async () => {
    server.use(rpcError("get_destaque_dia", { status: 400, message: "permission denied" }));

    await expect(listarDestaqueDia("2026-06-30")).rejects.toThrow(/Falha ao carregar craque do dia/);
  });
});
