/**
 * Testes da RPC get_destaque_dia() no BANCO local (supabase start).
 *
 * Foco: o destaque é por DIA de jogo no fuso de Brasília. Um jogo às 23h BRT
 * (02h UTC do dia seguinte) precisa contar no dia BRT em que foi disputado —
 * usar a data UTC bucketaria errado. Datas em agosto (fora da Copa) evitam
 * colisão com jogos do cenário. Transação + ROLLBACK não suja o cenário.
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

let participanteA: string;
let participanteB: string;
let userA: string;
let userB: string;
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
  userA = await ensureUser("dbdia-a@bolao.test", "Dia A");
  userB = await ensureUser("dbdia-b@bolao.test", "Dia B");
  const pa = await db.query("select id from participantes where user_id=$1 and bolao_id=$2", [
    userA,
    BOLAO,
  ]);
  participanteA = pa.rows[0].id;
  const pb = await db.query("select id from participantes where user_id=$1 and bolao_id=$2", [
    userB,
    BOLAO,
  ]);
  participanteB = pb.rows[0].id;
  const sel = await db.query("select id from selecoes order by codigo limit 2");
  selA = sel.rows[0].id;
  selB = sel.rows[1].id;
});

afterAll(async () => {
  if (userA) await admin.auth.admin.deleteUser(userA);
  if (userB) await admin.auth.admin.deleteUser(userB);
  await db.end();
});

beforeEach(async () => {
  await db.query("BEGIN");
  // Triggers off no setup: insere palpite em jogo já encerrado e crava pontos.
  await db.query("SET session_replication_role = replica");
});
afterEach(async () => {
  await db.query("ROLLBACK");
});

async function jogoEncerrado(dataHora: string): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id, gols_mandante, gols_visitante)
     values ('grupos', $1::timestamptz, 'Arena Dia', 'encerrada', $2, $3, 1, 0) returning id`,
    [dataHora, selA, selB]
  );
  return r.rows[0].id as string;
}

async function palpiteCom(participante: string, partida: string, pontos: number): Promise<void> {
  await db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante, pontos)
     values ($1, $2, 1, 0, $3)`,
    [participante, partida, pontos]
  );
}

async function destaque(
  dia: string | null
): Promise<{ dia: string; nome: string; pontos_dia: number }[]> {
  const r = await db.query("select dia::text, nome, pontos_dia from public.get_destaque_dia($1)", [
    dia,
  ]);
  return r.rows;
}

describe("get_destaque_dia — destaque por dia (BRT)", () => {
  it("jogo às 23h BRT (02h UTC do dia seguinte) conta no dia BRT correto", async () => {
    // 15/ago 23h BRT == 16/ago 02h UTC. Deve cair em 2026-08-15, não 16.
    const jogo = await jogoEncerrado("2026-08-15T23:00:00-03:00");
    await palpiteCom(participanteA, jogo, 5);
    await palpiteCom(participanteB, jogo, 3);
    await db.query("SET session_replication_role = DEFAULT");

    const linhas = await destaque("2026-08-15");
    expect(linhas).toHaveLength(1);
    expect(linhas[0].dia).toBe("2026-08-15");
    expect(linhas[0].nome).toBe("Dia A");
    expect(linhas[0].pontos_dia).toBe(5);

    // Nada cai no dia UTC (16) — prova que o bucket é BRT.
    expect(await destaque("2026-08-16")).toHaveLength(0);
  });

  it("soma os pontos do participante apenas dentro do dia consultado", async () => {
    const dia15 = await jogoEncerrado("2026-08-15T16:00:00-03:00");
    const dia16 = await jogoEncerrado("2026-08-16T16:00:00-03:00");
    await palpiteCom(participanteA, dia15, 5);
    await palpiteCom(participanteB, dia15, 2);
    await palpiteCom(participanteA, dia16, 1);
    await palpiteCom(participanteB, dia16, 8);
    await db.query("SET session_replication_role = DEFAULT");

    const d15 = await destaque("2026-08-15");
    expect(d15[0].nome).toBe("Dia A");
    expect(d15[0].pontos_dia).toBe(5);

    const d16 = await destaque("2026-08-16");
    expect(d16[0].nome).toBe("Dia B");
    expect(d16[0].pontos_dia).toBe(8);
  });

  it("sem parâmetro, usa o dia (BRT) do jogo encerrado mais recente", async () => {
    await palpiteCom(participanteA, await jogoEncerrado("2026-08-15T16:00:00-03:00"), 5);
    await palpiteCom(participanteB, await jogoEncerrado("2026-08-16T16:00:00-03:00"), 9);
    await db.query("SET session_replication_role = DEFAULT");

    const linhas = await destaque(null);
    expect(linhas[0].dia).toBe("2026-08-16");
    expect(linhas[0].nome).toBe("Dia B");
    expect(linhas[0].pontos_dia).toBe(9);
  });

  it("empate na liderança do dia devolve todos os líderes", async () => {
    const jogo = await jogoEncerrado("2026-08-15T16:00:00-03:00");
    await palpiteCom(participanteA, jogo, 4);
    await palpiteCom(participanteB, jogo, 4);
    await db.query("SET session_replication_role = DEFAULT");

    const linhas = await destaque("2026-08-15");
    expect(linhas).toHaveLength(2);
    expect(linhas.every((l) => l.pontos_dia === 4)).toBe(true);
  });
});
