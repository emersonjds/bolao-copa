import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { restList, restError } from "@/test/msw/handlers";
import { partidaDb, partidaIndefinidaDb } from "@/test/fixtures";
import { buscarPartidasMataMata } from "./bracket-fetcher";

const selBra = { id: "sel-bra", nome: "Brazil", codigo: "BRA" };
const selArg = { id: "sel-arg", nome: "Argentina", codigo: "ARG" };

const knockoutResolvidoDb = {
  ...partidaIndefinidaDb,
  id: "part-ko-res",
  numero: 89,
  mandante_id: "sel-bra",
  mandante_label: null,
  visitante_id: "sel-arg",
  visitante_label: null,
  mandante: selBra,
  visitante: selArg,
};

describe("buscarPartidasMataMata (integração Supabase via MSW)", () => {
  it("filtra grupos e retorna só as fases do mata-mata", async () => {
    server.use(restList("partidas", [partidaDb, partidaIndefinidaDb]));

    const partidas = await buscarPartidasMataMata();

    expect(partidas).toHaveLength(1);
    expect(partidas[0].fase).toBe("oitavas");
  });

  it("ordena por numero ascendente", async () => {
    const row90 = { ...partidaIndefinidaDb, id: "part-ko-90", numero: 90 };
    const row89 = { ...partidaIndefinidaDb, id: "part-ko-89", numero: 89 };
    server.use(restList("partidas", [row90, row89]));

    const partidas = await buscarPartidasMataMata();

    expect(partidas.map((p) => p.numero)).toEqual([89, 90]);
  });

  it("mapeia lado indefinido com id vazio e label como nome", async () => {
    server.use(restList("partidas", [partidaIndefinidaDb]));

    const [partida] = await buscarPartidasMataMata();

    expect(partida.mandante).toEqual({ id: "", nome: "1A", codigo: "1A" });
    expect(partida.visitante).toEqual({ id: "", nome: "2B", codigo: "2B" });
    expect(partida.mandanteLabel).toBe("1A");
    expect(partida.visitanteLabel).toBe("2B");
  });

  it("mapeia lado resolvido com nome em PT-BR", async () => {
    server.use(restList("partidas", [knockoutResolvidoDb]));

    const [partida] = await buscarPartidasMataMata();

    expect(partida.mandante).toEqual({ id: "sel-bra", nome: "Brasil", codigo: "BRA" });
    expect(partida.visitante).toEqual({ id: "sel-arg", nome: "Argentina", codigo: "ARG" });
    expect(partida.numero).toBe(89);
  });

  it("retorna lista vazia quando não há partidas do mata-mata", async () => {
    server.use(restList("partidas", [partidaDb]));

    expect(await buscarPartidasMataMata()).toEqual([]);
  });

  it("lança erro amigável quando a query falha", async () => {
    server.use(restError("partidas", { status: 400, message: "permission denied" }));

    await expect(buscarPartidasMataMata()).rejects.toThrow(/Falha ao carregar partidas/);
  });
});
