/**
 * Testes da regra de pontuação no BANCO (função apurar_pontos + trigger).
 * Bate no Postgres LOCAL (supabase start). Valida a fonte de verdade da
 * pontuação — algo que os testes de frontend (com mocks) não conseguem cobrir.
 *
 * Regra (tempo normal): 5 cravou vitória · 4 cravou empate · 3 acertou vencedor
 * · 2 acertou empate · 0 errou. Pênaltis NÃO contam.
 *
 * Cada teste cria partida+palpite numa transação e dá ROLLBACK no fim, então
 * não suja o cenário. Usa um participante de teste dedicado (criado uma vez).
 */
import { afterAll, beforeAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#"))
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOLAO = "00000000-0000-0000-0000-000000000b01";

const db = new Client({ connectionString: DB });
const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });
let participanteId: string;
let participanteId2: string;
let userIdTeste: string;
// Segundo usuário dedicado — necessário para os testes que exigem ≥2
// participantes (eh_admin, get_ranking). Garante que o arquivo seja
// auto-suficiente mesmo em banco recém-resetado (sem scenario:seed).
let userIdTeste2: string;
let selA: string;
let selB: string;

async function ensureUser(email: string, nome: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Db-Teste-2026!",
    email_confirm: true,
    user_metadata: { full_name: nome },
  });
  if (error || !data.user) throw new Error(`createUser falhou: ${error?.message}`);
  return data.user.id;
}

beforeAll(async () => {
  await db.connect();
  // Participante de teste dedicado (via Auth admin → handle_new_user cria o participante).
  userIdTeste = await ensureUser("dbtest@bolao.test", "DB Teste");
  userIdTeste2 = await ensureUser("dbtest2@bolao.test", "DB Teste 2");
  const pa = await db.query("select id from participantes where user_id=$1 and bolao_id=$2", [
    userIdTeste,
    BOLAO,
  ]);
  participanteId = pa.rows[0].id;
  const pa2 = await db.query("select id from participantes where user_id=$1 and bolao_id=$2", [
    userIdTeste2,
    BOLAO,
  ]);
  participanteId2 = pa2.rows[0].id;
  const sel = await db.query("select id from selecoes order by codigo limit 2");
  selA = sel.rows[0].id;
  selB = sel.rows[1].id;
});

afterAll(async () => {
  // Remove os usuários de teste (cascata apaga participante/palpites) pra não
  // poluir o ranking do cenário.
  if (userIdTeste) await admin.auth.admin.deleteUser(userIdTeste);
  if (userIdTeste2) await admin.auth.admin.deleteUser(userIdTeste2);
  await db.end();
});

beforeEach(async () => {
  await db.query("BEGIN");
});
afterEach(async () => {
  await db.query("ROLLBACK");
});

/** Cria uma partida HOJE (dentro da janela de palpite) na fase dada. */
async function novaPartida(fase = "grupos"): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
     values ($1, now() + interval '1 hour', 'Estádio Teste', 'agendada', $2, $3) returning id`,
    [fase, selA, selB]
  );
  return r.rows[0].id;
}

async function palpita(partida: string, gm: number, gv: number): Promise<void> {
  await db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante) values ($1,$2,$3,$4)`,
    [participanteId, partida, gm, gv]
  );
}

async function encerra(partida: string, gm: number, gv: number, penaltis = false): Promise<void> {
  await db.query(
    `update partidas set status='encerrada', gols_mandante=$2, gols_visitante=$3, vencedor_penaltis=$4 where id=$1`,
    [partida, gm, gv, penaltis ? selB : null]
  );
}

async function pontos(partida: string): Promise<number | null> {
  const r = await db.query(
    "select pontos from palpites where participante_id=$1 and partida_id=$2",
    [participanteId, partida]
  );
  return r.rows[0].pontos;
}

/** Atalho: palpite + resultado (na fase dada) → pontos. */
async function caso(
  guess: [number, number],
  res: [number, number],
  pen = false,
  fase = "grupos"
): Promise<number | null> {
  const p = await novaPartida(fase);
  await palpita(p, guess[0], guess[1]);
  await encerra(p, res[0], res[1], pen);
  return pontos(p);
}

describe("apurar_pontos — baldes de pontuação", () => {
  it("5: cravou o placar de uma vitória", async () => {
    expect(await caso([2, 1], [2, 1])).toBe(5);
  });

  it("4: cravou o placar de um empate", async () => {
    expect(await caso([1, 1], [1, 1])).toBe(4);
  });

  it("3: acertou o vencedor, placar errado", async () => {
    expect(await caso([3, 0], [2, 1])).toBe(3);
  });

  it("2: acertou que foi empate, placar errado", async () => {
    expect(await caso([0, 0], [1, 1])).toBe(2);
  });

  it("0: errou o resultado", async () => {
    expect(await caso([0, 2], [2, 1])).toBe(0);
  });
});

describe("apurar_pontos — multiplicador por fase", () => {
  it("grupos: ×1 (cravou vitória = 5)", async () => {
    expect(await caso([2, 1], [2, 1], false, "grupos")).toBe(5);
  });

  it("oitavas: ×2 (cravou vitória = 10)", async () => {
    expect(await caso([2, 1], [2, 1], false, "oitavas")).toBe(10);
  });

  it("quartas: ×2 (acertou só o vencedor = 6)", async () => {
    expect(await caso([3, 0], [2, 1], false, "quartas")).toBe(6);
  });

  it("semifinal: ×3 (cravou empate = 12)", async () => {
    expect(await caso([1, 1], [1, 1], false, "semifinal")).toBe(12);
  });

  it("final: ×3 (cravou vitória = 15)", async () => {
    expect(await caso([2, 1], [2, 1], false, "final")).toBe(15);
  });

  it("errar continua 0 em qualquer fase", async () => {
    expect(await caso([0, 2], [2, 1], false, "final")).toBe(0);
  });
});

describe("apurar_pontos — pênaltis não contam (com multiplicador)", () => {
  it("final: empate cravado nos pênaltis vale 12 (4×3, não 5×3)", async () => {
    expect(await caso([1, 1], [1, 1], true, "final")).toBe(12);
  });

  it("final: empate acertado (placar errado) nos pênaltis vale 6 (2×3)", async () => {
    expect(await caso([2, 2], [1, 1], true, "final")).toBe(6);
  });
});

describe("apurar_pontos — idempotência e reapuração", () => {
  it("reapurar com o mesmo placar mantém os pontos", async () => {
    const p = await novaPartida();
    await palpita(p, 2, 1);
    await encerra(p, 2, 1);
    expect(await pontos(p)).toBe(5);
    await encerra(p, 2, 1); // dispara o trigger de novo
    expect(await pontos(p)).toBe(5);
  });

  it("editar o placar recomputa os pontos", async () => {
    const p = await novaPartida();
    await palpita(p, 2, 1); // crava 2x1
    await encerra(p, 2, 1);
    expect(await pontos(p)).toBe(5);
    await encerra(p, 3, 0); // resultado vira 3x0 → só acertou o vencedor
    expect(await pontos(p)).toBe(3);
    await encerra(p, 0, 2); // resultado vira derrota → errou
    expect(await pontos(p)).toBe(0);
  });
});

describe("enforce_palpite_lock — trava no apito", () => {
  it("bloqueia palpite depois que a partida começou", async () => {
    const r = await db.query(
      `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
       values ('grupos', now() - interval '1 hour', 'Estádio Teste', 'agendada', $1, $2) returning id`,
      [selA, selB]
    );
    const partida = r.rows[0].id;
    await expect(
      db.query(
        `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante) values ($1,$2,1,0)`,
        [participanteId, partida]
      )
    ).rejects.toThrow(/encerrado|começou/i);
  });

  it("permite palpite antes do apito", async () => {
    const p = await novaPartida();
    await expect(palpita(p, 1, 0)).resolves.toBeUndefined();
  });
});

describe("segurança — grants de profiles (anti-escalonamento de admin)", () => {
  it("authenticated NÃO pode escrever is_admin", async () => {
    await db.query("set role authenticated");
    await expect(
      db.query("update public.profiles set is_admin = true where id = $1", [userIdTeste])
    ).rejects.toThrow(/permission denied/i);
  });

  it("authenticated pode atualizar nome/avatar (nível de privilégio)", async () => {
    await db.query("set role authenticated");
    await expect(
      db.query("update public.profiles set nome = 'x' where id = $1", [userIdTeste])
    ).resolves.toBeDefined();
  });

  it("authenticated NÃO pode LER a coluna is_admin", async () => {
    await db.query("set role authenticated");
    await expect(db.query("select is_admin from public.profiles limit 1")).rejects.toThrow(
      /permission denied/i
    );
  });

  it("eh_admin() reflete o is_admin do usuário logado", async () => {
    await db.query("update public.profiles set is_admin = true where id = $1", [userIdTeste]);
    await db.query("update public.profiles set is_admin = false where id = $1", [userIdTeste2]);

    // Simula a sessão do admin (auth.uid() = userIdTeste, via GUC do JWT).
    await db.query(
      "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
      [userIdTeste]
    );
    const admin = await db.query<{ ok: boolean }>("select public.eh_admin() as ok");
    expect(admin.rows[0].ok).toBe(true);

    // Simula a sessão de um não-admin → false.
    await db.query(
      "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
      [userIdTeste2]
    );
    const outro = await db.query<{ ok: boolean }>("select public.eh_admin() as ok");
    expect(outro.rows[0].ok).toBe(false);
  });

  it("eh_admin não aceita mais uid externo (fecha enumeração de admins)", async () => {
    // Regressão de segurança (0023): a sobrecarga eh_admin(uuid) foi removida,
    // então ninguém consegue perguntar "fulano é admin?" sobre outra conta.
    await expect(db.query("select public.eh_admin($1)", [userIdTeste])).rejects.toThrow(
      /does not exist/i
    );
  });
});

async function rankingPontos(pid: string): Promise<number> {
  const r = await db.query<{ participante_id: string; pontos_totais: number }>(
    "select participante_id, pontos_totais from public.get_ranking()"
  );
  const row = r.rows.find((x) => x.participante_id === pid);
  return row ? Number(row.pontos_totais) : 0;
}

describe("hardening — validação e integridade (0024–0026)", () => {
  it("0024: rejeita gols negativos no palpite (CHECK no servidor)", async () => {
    const p = await novaPartida();
    await expect(palpita(p, -1, 0)).rejects.toThrow(/palpites_gols_validos|check/i);
  });

  it("0024: rejeita placar absurdo no resultado da partida", async () => {
    const p = await novaPartida();
    await expect(
      db.query(
        "update partidas set status='encerrada', gols_mandante=100, gols_visitante=0 where id=$1",
        [p]
      )
    ).rejects.toThrow(/partidas_gols_validos|check/i);
  });

  it("0026: authenticated não tem grant de UPDATE em updated_at (só nos gols)", async () => {
    const r = await db.query<{ gols: boolean; upd: boolean }>(
      `select has_column_privilege('authenticated','public.palpites','gols_mandante','UPDATE') as gols,
              has_column_privilege('authenticated','public.palpites','updated_at','UPDATE') as upd`
    );
    expect(r.rows[0].gols).toBe(true);
    expect(r.rows[0].upd).toBe(false);
  });

  it("0025: pontos de partida revertida para não-encerrada saem do ranking", async () => {
    await db.query("delete from palpites"); // isola (rollback no fim)
    const p = await novaPartida();
    await palpita(p, 2, 1);
    await encerra(p, 2, 1); // crava vitória nos grupos → 5 pts
    expect(await rankingPontos(participanteId)).toBe(5);

    // Reverte o status sem mudar gols: o trigger de apuração não dispara, mas o
    // ranking deve parar de contar os pontos residuais.
    await db.query("update partidas set status='ao-vivo' where id=$1", [p]);
    expect(await rankingPontos(participanteId)).toBe(0);
  });
});

/**
 * Escrita de palpite pelo caminho REAL do app: role `authenticated` + JWT do
 * dono, exatamente como o PostgREST opera. Os demais testes rodam como
 * `postgres` (superuser), que IGNORA grants de coluna e RLS — foi essa cegueira
 * que deixou a 0026 quebrar o upsert em produção sem nenhum teste pegar. Aqui
 * tudo passa pelos grants e policies de verdade.
 */
describe("escrita de palpite como authenticated (caminho real do app)", () => {
  /** Entra na sessão do usuário: JWT (auth.uid) + troca de role. ROLLBACK reseta. */
  async function comoAuth(userId: string): Promise<void> {
    await db.query(
      "select set_config('request.jwt.claims', json_build_object('sub', $1::text, 'role', 'authenticated')::text, true)",
      [userId]
    );
    await db.query("set role authenticated");
  }

  /** Upsert idêntico ao do PostgREST: o SET inclui as colunas de conflito. */
  function upsertPalpite(pid: string, partida: string, gm: number, gv: number) {
    return db.query(
      `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante)
       values ($1, $2, $3, $4)
       on conflict (participante_id, partida_id) do update set
         participante_id = excluded.participante_id,
         partida_id      = excluded.partida_id,
         gols_mandante   = excluded.gols_mandante,
         gols_visitante  = excluded.gols_visitante`,
      [pid, partida, gm, gv]
    );
  }

  it("cria palpite novo via upsert (ramo INSERT)", async () => {
    const p = await novaPartida();
    await comoAuth(userIdTeste);
    await expect(upsertPalpite(participanteId, p, 2, 1)).resolves.toBeDefined();
  });

  it("0028: edita palpite existente via upsert (ramo ON CONFLICT) — regressão do bug de prod", async () => {
    const p = await novaPartida();
    await palpita(p, 1, 0); // INSERT inicial como postgres
    await comoAuth(userIdTeste);
    await expect(upsertPalpite(participanteId, p, 3, 2)).resolves.toBeDefined();
  });

  it("UPDATE simples só dos gols funciona", async () => {
    const p = await novaPartida();
    await palpita(p, 1, 0);
    await comoAuth(userIdTeste);
    await expect(
      db.query("update palpites set gols_mandante=4 where participante_id=$1 and partida_id=$2", [
        participanteId,
        p,
      ])
    ).resolves.toBeDefined();
  });

  it("0026 mantido: NÃO consegue escrever updated_at", async () => {
    const p = await novaPartida();
    await palpita(p, 1, 0);
    await comoAuth(userIdTeste);
    await expect(
      db.query(
        "update palpites set gols_mandante=2, updated_at=now() where participante_id=$1 and partida_id=$2",
        [participanteId, p]
      )
    ).rejects.toThrow(/permission denied/i);
  });

  it("anti-fraude: NÃO consegue escrever pontos (UPDATE)", async () => {
    const p = await novaPartida();
    await palpita(p, 1, 0);
    await comoAuth(userIdTeste);
    await expect(
      db.query("update palpites set pontos=999 where participante_id=$1 and partida_id=$2", [
        participanteId,
        p,
      ])
    ).rejects.toThrow(/permission denied/i);
  });

  it("anti-fraude: NÃO consegue inserir pontos (INSERT)", async () => {
    const p = await novaPartida();
    await comoAuth(userIdTeste);
    await expect(
      db.query(
        "insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante, pontos) values ($1,$2,1,0,999)",
        [participanteId, p]
      )
    ).rejects.toThrow(/permission denied/i);
  });

  it("RLS: NÃO consegue criar palpite para OUTRO participante", async () => {
    const p = await novaPartida();
    await comoAuth(userIdTeste);
    await expect(upsertPalpite(participanteId2, p, 1, 0)).rejects.toThrow(
      /row-level security|violates/i
    );
  });

  it("NÃO consegue realocar palpite próprio para OUTRO participante", async () => {
    // Defesa em profundidade: o grant de UPDATE em participante_id (necessário
    // pro upsert) NÃO abre brecha — o trigger de imutabilidade (0012) barra a
    // troca de dono antes mesmo da checagem de RLS.
    const p = await novaPartida();
    await palpita(p, 1, 0); // palpite meu
    await comoAuth(userIdTeste);
    await expect(
      db.query(
        "update palpites set participante_id=$1 where participante_id=$2 and partida_id=$3",
        [participanteId2, participanteId, p]
      )
    ).rejects.toThrow(/imutável|row-level security|violates/i);
  });

  it("0024: CHECK de gols vale também para authenticated (gol negativo)", async () => {
    const p = await novaPartida();
    await comoAuth(userIdTeste);
    await expect(upsertPalpite(participanteId, p, -1, 0)).rejects.toThrow(
      /palpites_gols_validos|check/i
    );
  });

  it("0024: CHECK de gols rejeita placar absurdo (>99)", async () => {
    const p = await novaPartida();
    await comoAuth(userIdTeste);
    await expect(upsertPalpite(participanteId, p, 100, 0)).rejects.toThrow(
      /palpites_gols_validos|check/i
    );
  });

  it("janela: NÃO consegue editar palpite depois do apito", async () => {
    const p = await novaPartida();
    await palpita(p, 1, 0);
    await db.query("update partidas set data_hora = now() - interval '1 hour' where id=$1", [p]);
    await comoAuth(userIdTeste);
    await expect(upsertPalpite(participanteId, p, 3, 0)).rejects.toThrow(/encerrado|começou/i);
  });
});

describe("get_ranking — desempate", () => {
  it("empate em pontos: mais placares cravados fica na frente", async () => {
    const participanteA = participanteId;
    const outro = await db.query("select id from participantes where id <> $1 limit 1", [
      participanteA,
    ]);
    const participanteB = outro.rows[0].id as string;

    await db.query("delete from palpites"); // escopo da transação (rollback no fim)

    const jogos: string[] = [];
    for (let i = 0; i < 5; i += 1) jogos.push(await novaPartida());

    // A crava 3 jogos: 5+5+5 = 15 pts, 3 placares cravados.
    for (let i = 0; i < 3; i += 1) {
      await db.query(
        "insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante) values ($1,$2,2,1)",
        [participanteA, jogos[i]]
      );
    }
    // B acerta só o vencedor em 5 jogos: 3×5 = 15 pts, 0 cravados.
    for (let i = 0; i < 5; i += 1) {
      await db.query(
        "insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante) values ($1,$2,1,0)",
        [participanteB, jogos[i]]
      );
    }
    for (const jogo of jogos) await encerra(jogo, 2, 1); // todos 2x1 → apura

    const ranking = await db.query<{ participante_id: string; pontos_totais: number }>(
      "select participante_id, pontos_totais from public.get_ranking()"
    );
    const idxA = ranking.rows.findIndex((linha) => linha.participante_id === participanteA);
    const idxB = ranking.rows.findIndex((linha) => linha.participante_id === participanteB);

    expect(ranking.rows[idxA].pontos_totais).toBe(15);
    expect(ranking.rows[idxB].pontos_totais).toBe(15);
    expect(idxA).toBeLessThan(idxB); // mesmo total, mais cravados desempata na frente
  });
});
