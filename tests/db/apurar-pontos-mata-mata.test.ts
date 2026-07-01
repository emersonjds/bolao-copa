// Testa a regra de pontuação do mata-mata ("quem avança") no banco.
// Padrão: pg Client + BEGIN/ROLLBACK; participante criado via Auth admin
// (handle_new_user cria o participante — mesmo padrão de apurar-pontos.test.ts).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#")) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOLAO = "00000000-0000-0000-0000-000000000b01";

const db = new Client({ connectionString: DB });
const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });

let selA: string, selB: string, participante: string, userIdTeste: string;

beforeAll(async () => {
  await db.connect();

  const email = "dbtest-mata-mata-apuracao@bolao.test";
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "Db-Teste-2026!",
      email_confirm: true,
      user_metadata: { full_name: "DB Mata-Mata Apuracao Teste" },
    });
    if (error || !data.user) throw new Error(`createUser falhou: ${error?.message}`);
    userId = data.user.id;
  }
  userIdTeste = userId;

  const pa = await db.query("select id from participantes where user_id=$1 and bolao_id=$2", [
    userId,
    BOLAO,
  ]);
  participante = pa.rows[0].id;

  const s = await db.query("select id from selecoes order by codigo limit 2");
  [selA, selB] = s.rows.map((r: { id: string }) => r.id);
});

afterAll(async () => {
  if (userIdTeste) await admin.auth.admin.deleteUser(userIdTeste);
  await db.end();
});

beforeEach(async () => { await db.query("BEGIN"); });
afterEach(async () => { await db.query("ROLLBACK"); });

// Cria partida de oitavas (peso ×2), faz um palpite, encerra e devolve pontos.
async function cenario(opts: {
  pgm: number; pgv: number; avanca: string | null;
  rgm: number; rgv: number; pen: string | null;
}): Promise<number> {
  const p = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id, numero)
     values ('oitavas', now() + interval '1 hour', 'Arena', 'agendada', $1, $2, 9002) returning id`,
    [selA, selB],
  );
  const partida = p.rows[0].id;
  await db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante, vencedor_avanca)
     values ($1, $2, $3, $4, $5)`,
    [participante, partida, opts.pgm, opts.pgv, opts.avanca],
  );
  await db.query(
    `update partidas set status='encerrada', gols_mandante=$2, gols_visitante=$3, vencedor_penaltis=$4, data_hora=now()-interval '1 hour' where id=$1`,
    [partida, opts.rgm, opts.rgv, opts.pen],
  );
  const r = await db.query("select pontos from palpites where partida_id=$1", [partida]);
  return r.rows[0].pontos as number;
}

describe("apurar_pontos — mata-mata (oitavas ×2)", () => {
  it("cravou vitória + quem passa = 5×2", async () => {
    expect(await cenario({ pgm: 2, pgv: 1, avanca: null, rgm: 2, rgv: 1, pen: null })).toBe(10);
  });
  it("acertou quem passa, placar errado = 3×2", async () => {
    expect(await cenario({ pgm: 2, pgv: 1, avanca: null, rgm: 1, rgv: 0, pen: null })).toBe(6);
  });
  it("apostou vencedor, jogo foi a pênaltis e o time passou = 3×2", async () => {
    expect(await cenario({ pgm: 2, pgv: 1, avanca: null, rgm: 0, rgv: 0, pen: selA })).toBe(6);
  });
  it("cravou empate + acertou quem passa = 4×2", async () => {
    expect(await cenario({ pgm: 1, pgv: 1, avanca: selA, rgm: 1, rgv: 1, pen: selA })).toBe(8);
  });
  it("cravou empate mas errou quem passa = 0", async () => {
    expect(await cenario({ pgm: 1, pgv: 1, avanca: selA, rgm: 1, rgv: 1, pen: selB })).toBe(0);
  });
  it("empate sem escolher quem passa = 0", async () => {
    expect(await cenario({ pgm: 1, pgv: 1, avanca: null, rgm: 1, rgv: 1, pen: selA })).toBe(0);
  });
  it("apontou o time errado = 0", async () => {
    expect(await cenario({ pgm: 0, pgv: 2, avanca: null, rgm: 0, rgv: 0, pen: selA })).toBe(0);
  });
});
