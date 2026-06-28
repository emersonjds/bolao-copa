import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { restList, restError } from "@/test/msw/handlers";
import { mataMataDefinido } from "./mata-mata-pronto";

describe("mataMataDefinido", () => {
  it("true quando há confronto de trinta-e-dois com os dois lados definidos", async () => {
    server.use(restList("partidas", [{ id: "p1" }]));
    expect(await mataMataDefinido()).toBe(true);
  });

  it("false quando ainda não há confronto definido", async () => {
    server.use(restList("partidas", []));
    expect(await mataMataDefinido()).toBe(false);
  });

  it("false (silencioso) quando a leitura falha", async () => {
    server.use(restError("partidas", { method: "get", status: 400, message: "boom" }));
    expect(await mataMataDefinido()).toBe(false);
  });
});
