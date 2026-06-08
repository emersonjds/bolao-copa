import { describe, it, expect } from "vitest";
import { server } from "@/test/msw/server";
import { restList, restError } from "@/test/msw/handlers";
import { partidaDb, partidaIndefinidaDb } from "@/test/fixtures";
import { listarPartidas } from "./partidas-fetcher";

describe("listarPartidas (integração Supabase via MSW)", () => {
  it("mapeia a partida traduzindo os nomes das seleções para PT-BR via código FIFA", async () => {
    server.use(restList("partidas", [partidaDb]));

    const partidas = await listarPartidas();

    expect(partidas).toEqual([
      {
        id: "part-1",
        fase: "grupos",
        grupo: "A",
        dataHora: "2026-06-11T19:00:00.000Z",
        janelaInicio: "2026-06-11T03:00:00Z",
        estadio: "Mexico City",
        status: "agendada",
        mandante: { id: "sel-mex", nome: "México", codigo: "MEX" },
        visitante: { id: "sel-rsa", nome: "África do Sul", codigo: "RSA" },
        golsMandante: null,
        golsVisitante: null,
        vencedorPenaltis: null,
        mandanteLabel: null,
        visitanteLabel: null,
      },
    ]);
  });

  it("expõe janelaInicio mapeado de janela_inicio do banco", async () => {
    server.use(restList("partidas", [partidaDb]));

    const [partida] = await listarPartidas();

    expect(partida.janelaInicio).toBe("2026-06-11T03:00:00Z");
  });

  it("mantém o nome original quando o código FIFA é desconhecido (fallback)", async () => {
    const partidaCodigoDesconhecido = {
      ...partidaDb,
      mandante: { id: "sel-xyz", nome: "Atlantis", codigo: "XYZ" },
    };
    server.use(restList("partidas", [partidaCodigoDesconhecido]));

    const [partida] = await listarPartidas();

    expect(partida.mandante).toEqual({ id: "sel-xyz", nome: "Atlantis", codigo: "XYZ" });
  });

  it("usa o rótulo de exibição em confronto de mata-mata ainda indefinido", async () => {
    server.use(restList("partidas", [partidaIndefinidaDb]));

    const [partida] = await listarPartidas();

    expect(partida.mandante).toEqual({ id: "", nome: "1A", codigo: "1A" });
    expect(partida.visitante).toEqual({ id: "", nome: "2B", codigo: "2B" });
    expect(partida.mandanteLabel).toBe("1A");
    expect(partida.visitanteLabel).toBe("2B");
    expect(partida.fase).toBe("oitavas");
    expect(partida.grupo).toBeNull();
  });

  it("usa '?' como placeholder quando seleção e rótulo são nulos", async () => {
    const partidaSemRotulo = {
      ...partidaIndefinidaDb,
      mandante_label: null,
      visitante_label: null,
    };
    server.use(restList("partidas", [partidaSemRotulo]));

    const [partida] = await listarPartidas();

    expect(partida.mandante).toEqual({ id: "", nome: "?", codigo: "?" });
    expect(partida.visitante).toEqual({ id: "", nome: "?", codigo: "?" });
  });

  it("retorna lista vazia quando não há partidas", async () => {
    server.use(restList("partidas", []));
    expect(await listarPartidas()).toEqual([]);
  });

  it("lança erro amigável quando a query falha", async () => {
    server.use(restError("partidas", { status: 400, message: "permission denied" }));
    await expect(listarPartidas()).rejects.toThrow(/Falha ao carregar partidas/);
  });
});
