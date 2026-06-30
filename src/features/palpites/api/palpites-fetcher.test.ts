import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { restSingle, restList, restWrite, restError } from "@/test/msw/handlers";
import { palpiteDb } from "@/test/fixtures";
import { buscarParticipanteId, listarMeusPalpites, salvarPalpite } from "./palpites-fetcher";

// ---------------------------------------------------------------------------
// buscarParticipanteId
// ---------------------------------------------------------------------------

describe("buscarParticipanteId", () => {
  it("retorna o id do participante quando a query retorna uma linha", async () => {
    server.use(restSingle("participantes", { id: "part-id-1" }));

    const id = await buscarParticipanteId("user-test-1");

    expect(id).toBe("part-id-1");
  });

  it("lança erro contendo a mensagem do banco quando nenhuma linha é encontrada", async () => {
    server.use(
      restError("participantes", {
        method: "get",
        status: 406,
        code: "PGRST116",
        message: "The result contains 0 rows",
      })
    );

    await expect(buscarParticipanteId("user-test-1")).rejects.toThrow(
      "Participante não encontrado no bolão padrão"
    );
  });
});

// ---------------------------------------------------------------------------
// listarMeusPalpites
// ---------------------------------------------------------------------------

describe("listarMeusPalpites", () => {
  it("mapeia corretamente a lista de palpites (snake_case → camelCase)", async () => {
    server.use(restList("palpites", [palpiteDb]));

    const palpites = await listarMeusPalpites("part-id-1");

    expect(palpites).toEqual([
      {
        id: "palpite-1",
        participanteId: "part-id-1",
        partidaId: "part-1",
        golsMandante: 2,
        golsVisitante: 0,
        pontos: null,
      },
    ]);
  });

  it("retorna array vazio quando participante não tem palpites", async () => {
    server.use(restList("palpites", []));

    const palpites = await listarMeusPalpites("part-id-1");

    expect(palpites).toEqual([]);
  });

  it("lança erro com a mensagem do banco quando a query falha", async () => {
    server.use(
      restError("palpites", {
        method: "get",
        status: 500,
        message: "internal server error",
      })
    );

    await expect(listarMeusPalpites("part-id-1")).rejects.toThrow("Falha ao carregar palpites");
  });
});

// ---------------------------------------------------------------------------
// salvarPalpite
// ---------------------------------------------------------------------------

describe("salvarPalpite", () => {
  it("resolve void quando o upsert é bem-sucedido (201)", async () => {
    server.use(restWrite("palpites", { method: "post", status: 201 }));

    await expect(
      salvarPalpite({
        participanteId: "part-id-1",
        partidaId: "part-1",
        golsMandante: 2,
        golsVisitante: 1,
      })
    ).resolves.toBeUndefined();
  });

  it("lança erro com a mensagem do banco quando a permissão é negada (403)", async () => {
    server.use(
      restError("palpites", {
        method: "post",
        status: 403,
        code: "42501",
        message: "permission denied for table palpites",
      })
    );

    await expect(
      salvarPalpite({
        participanteId: "part-id-1",
        partidaId: "part-1",
        golsMandante: 2,
        golsVisitante: 1,
      })
    ).rejects.toThrow("Falha ao salvar palpite: permission denied for table palpites");
  });
});
