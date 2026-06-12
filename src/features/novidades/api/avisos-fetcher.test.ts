import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { restList, restWrite, restError } from "@/test/msw/handlers";
import { avisoFoiVisto, marcarAvisoVisto } from "./avisos-fetcher";

describe("avisoFoiVisto", () => {
  it("retorna false quando não há registro do aviso", async () => {
    server.use(restList("avisos_vistos", []));
    expect(await avisoFoiVisto("user-1", "novidades-2026-06")).toBe(false);
  });

  it("retorna true quando o aviso já foi visto", async () => {
    server.use(restList("avisos_vistos", [{ aviso_id: "novidades-2026-06" }]));
    expect(await avisoFoiVisto("user-1", "novidades-2026-06")).toBe(true);
  });

  it("lança erro com a mensagem do banco em falha de leitura", async () => {
    server.use(
      restError("avisos_vistos", { method: "get", status: 400, message: "permission denied" })
    );
    await expect(avisoFoiVisto("user-1", "x")).rejects.toThrow("Falha ao verificar aviso");
  });
});

describe("marcarAvisoVisto", () => {
  it("faz upsert sem erro", async () => {
    server.use(restWrite("avisos_vistos", { method: "post" }));
    await expect(marcarAvisoVisto("user-1", "novidades-2026-06")).resolves.toBeUndefined();
  });

  it("lança erro com a mensagem do banco quando o upsert falha", async () => {
    server.use(
      restError("avisos_vistos", { method: "post", status: 400, message: "rls violated" })
    );
    await expect(marcarAvisoVisto("user-1", "x")).rejects.toThrow("Falha ao marcar aviso");
  });
});
