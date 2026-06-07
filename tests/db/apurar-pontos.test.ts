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
let userIdTeste: string;
let selA: string;
let selB: string;

beforeAll(async () => {
  await db.connect();
  // Participante de teste dedicado (via Auth admin → handle_new_user cria o participante).
  const email = "dbtest@bolao.test";
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "Db-Teste-2026!",
      email_confirm: true,
      user_metadata: { full_name: "DB Teste" },
    });
    if (error || !data.user) throw new Error(`createUser falhou: ${error?.message}`);
    userId = data.user.id;
  }
  userIdTeste = userId;
  const pa = await db.query("select id from participantes where user_id=$1 and bolao_id=$2", [
    userId,
    BOLAO,
  ]);
  participanteId = pa.rows[0].id;
  const sel = await db.query("select id from selecoes order by codigo limit 2");
  selA = sel.rows[0].id;
  selB = sel.rows[1].id;
});

afterAll(async () => {
  // Remove o usuário de teste (cascata apaga participante/palpites) pra não
  // poluir o ranking do cenário.
  if (userIdTeste) await admin.auth.admin.deleteUser(userIdTeste);
  await db.end();
});

beforeEach(async () => {
  await db.query("BEGIN");
});
afterEach(async () => {
  await db.query("ROLLBACK");
});

/** Cria uma partida agendada no futuro (a trava libera o palpite). */
async function novaPartida(fase = "grupos"): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
     values ($1, now() + interval '10 days', 'Estádio Teste', 'agendada', $2, $3) returning id`,
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
});
