// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarBackup, lerTabelaCompleta } from "./backup-core";

type Linha = Record<string, unknown>;

/** Fake mínimo do supabase-js: cada chamada a range() devolve a próxima página. */
function clienteFake(opcoes: {
  paginasPorTabela?: Record<string, Linha[][]>;
  linhasPorTabela?: Record<string, Linha[]>;
  ranking?: Linha[];
  authUsers?: { id: string; email: string }[];
}): SupabaseClient {
  const cursores: Record<string, number> = {};
  return {
    from: (tabela: string) => ({
      select: () => ({
        order: () => ({
          range: async () => {
            if (opcoes.paginasPorTabela?.[tabela]) {
              const pagina = cursores[tabela] ?? 0;
              cursores[tabela] = pagina + 1;
              return { data: opcoes.paginasPorTabela[tabela][pagina] ?? [], error: null };
            }
            const linhas = opcoes.linhasPorTabela?.[tabela] ?? [];
            const pagina = cursores[tabela] ?? 0;
            cursores[tabela] = pagina + 1;
            return { data: pagina === 0 ? linhas : [], error: null };
          },
        }),
      }),
    }),
    rpc: async () => ({ data: opcoes.ranking ?? [], error: null }),
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: opcoes.authUsers ?? [] }, error: null }),
      },
    },
  } as unknown as SupabaseClient;
}

const LINHAS_MINIMAS: Record<string, Linha[]> = {
  profiles: [{ id: "u1", nome: "Ana" }],
  selecoes: [{ id: "s1", nome: "Brasil", codigo: "BRA" }],
  partidas: [{ id: "pt1", fase: "grupos" }],
  boloes: [{ id: "b1", organizador_id: null }],
  participantes: [{ id: "pa1", user_id: "u1", bolao_id: "b1" }],
  convites: [],
  palpites: [{ id: "pp1", participante_id: "pa1", partida_id: "pt1", pontos: 5 }],
};

describe("lerTabelaCompleta", () => {
  it("pagina além do limite de 1000 linhas do PostgREST", async () => {
    const pagina1 = Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}` }));
    const pagina2 = [{ id: "b1" }];
    const linhas = await lerTabelaCompleta(
      clienteFake({ paginasPorTabela: { palpites: [pagina1, pagina2] } }),
      "palpites"
    );
    expect(linhas).toHaveLength(1001);
  });
});

describe("gerarBackup", () => {
  it("monta o JSON completo: tabelas, contagens, ranking com posição e auth_users", async () => {
    const backup = await gerarBackup(
      clienteFake({
        linhasPorTabela: LINHAS_MINIMAS,
        ranking: [
          { participante_id: "pa1", nome: "Ana", avatar_url: null, pontos_totais: 5, jogos_pontuados: 1 },
        ],
        authUsers: [{ id: "u1", email: "ana@bolao.test" }],
      })
    );
    expect(backup.contagens).toEqual({
      profiles: 1, selecoes: 1, partidas: 1, boloes: 1, participantes: 1, convites: 0, palpites: 1,
    });
    expect(backup.ranking[0]).toMatchObject({ posicao: 1, nome: "Ana", pontos_totais: 5 });
    expect(backup.auth_users).toEqual([{ id: "u1", email: "ana@bolao.test" }]);
    expect(backup.schema_version).toMatch(/^\d{4}$/);
  });

  it("aborta se tabela essencial vier vazia", async () => {
    await expect(
      gerarBackup(clienteFake({ linhasPorTabela: { ...LINHAS_MINIMAS, palpites: [] } }))
    ).rejects.toThrow(/tabelas essenciais vazias: palpites/);
  });
});
