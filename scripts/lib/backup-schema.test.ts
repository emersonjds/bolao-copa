// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  backupSchema,
  dataBrtHoje,
  schemaVersionDoRepo,
  tabelasEssenciaisVazias,
} from "./backup-schema";

describe("dataBrtHoje", () => {
  it("formata a data no fuso de São Paulo (YYYY-MM-DD)", () => {
    // 02:30 UTC do dia 16 ainda é dia 15 às 23:30 em BRT (UTC-3)
    expect(dataBrtHoje(new Date("2026-06-16T02:30:00Z"))).toBe("2026-06-15");
    // 06:00 UTC (horário do cron) já é dia 16 às 03:00 em BRT
    expect(dataBrtHoje(new Date("2026-06-16T06:00:00Z"))).toBe("2026-06-16");
  });
});

describe("schemaVersionDoRepo", () => {
  it("retorna o prefixo numérico da última migration", () => {
    expect(schemaVersionDoRepo()).toMatch(/^\d{4}$/);
  });
});

describe("tabelasEssenciaisVazias", () => {
  it("aponta as essenciais zeradas", () => {
    expect(
      tabelasEssenciaisVazias({ profiles: 5, participantes: 0, partidas: 104, palpites: 0 })
    ).toEqual(["participantes", "palpites"]);
  });
  it("retorna vazio quando tudo tem linhas", () => {
    expect(
      tabelasEssenciaisVazias({ profiles: 1, participantes: 1, partidas: 1, palpites: 1 })
    ).toEqual([]);
  });
});

describe("backupSchema", () => {
  it("rejeita linha de tabela sem id", () => {
    const resultado = backupSchema.safeParse({
      gerado_em: "2026-06-10T06:00:00.000Z",
      schema_version: "0019",
      contagens: { profiles: 1 },
      ranking: [],
      tabelas: {
        profiles: [{ nome: "sem id" }],
        selecoes: [],
        partidas: [],
        boloes: [],
        participantes: [],
        convites: [],
        palpites: [],
      },
      auth_users: [],
    });
    expect(resultado.success).toBe(false);
  });
});
