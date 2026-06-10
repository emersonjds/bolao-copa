// @vitest-environment node
import { describe, it, expect } from "vitest";
import { remapearBackup } from "./restore-core";
import { backupSchema, type Backup } from "./backup-schema";

function backupMinimo(): Backup {
  return backupSchema.parse({
    gerado_em: "2026-06-10T06:00:00.000Z",
    schema_version: "0019",
    contagens: { profiles: 1, participantes: 1, partidas: 1, palpites: 1 },
    ranking: [],
    tabelas: {
      profiles: [{ id: "user-velho", nome: "Ana" }],
      selecoes: [],
      partidas: [{ id: "pt1" }],
      boloes: [
        { id: "b1", organizador_id: null },
        { id: "b2", organizador_id: "user-velho" },
      ],
      participantes: [{ id: "pa1", user_id: "user-velho", bolao_id: "b1" }],
      convites: [],
      palpites: [{ id: "pp1", participante_id: "pa1" }],
    },
    auth_users: [{ id: "user-velho", email: "ana@bolao.test" }],
  });
}

describe("remapearBackup", () => {
  it("troca os ids de usuário em profiles.id, participantes.user_id e boloes.organizador_id", () => {
    const mapa = new Map([["user-velho", "user-novo"]]);
    const remapeado = remapearBackup(backupMinimo(), mapa);
    expect(remapeado.tabelas.profiles[0].id).toBe("user-novo");
    expect(remapeado.tabelas.participantes[0].user_id).toBe("user-novo");
    expect(remapeado.tabelas.boloes[1].organizador_id).toBe("user-novo");
  });

  it("preserva organizador_id nulo e não toca em palpites/partidas", () => {
    const remapeado = remapearBackup(backupMinimo(), new Map([["user-velho", "user-novo"]]));
    expect(remapeado.tabelas.boloes[0].organizador_id).toBeNull();
    expect(remapeado.tabelas.palpites[0].participante_id).toBe("pa1");
    expect(remapeado.tabelas.partidas[0].id).toBe("pt1");
  });

  it("não muta o backup original (mesmo projeto usa o original intacto)", () => {
    const original = backupMinimo();
    remapearBackup(original, new Map([["user-velho", "user-novo"]]));
    expect(original.tabelas.profiles[0].id).toBe("user-velho");
  });

  it("explode se faltar mapeamento pra algum usuário", () => {
    expect(() => remapearBackup(backupMinimo(), new Map())).toThrow(/Sem usuário no destino/);
  });
});
