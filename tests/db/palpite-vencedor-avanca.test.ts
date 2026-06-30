// Testa a coluna vencedor_avanca e o trigger trg_validar_vencedor_avanca.
// Padrão: pg Client + BEGIN/ROLLBACK; participante criado via Auth admin
// (mesmo padrão de apurar-pontos.test.ts e palpite-janela.test.ts).
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

let selA: string, selB: string, selC: string;
let participante: string;
let userIdTeste: string;
let partida: string;

beforeAll(async () => {
  await db.connect();

  const email = "dbtest-vencedor-avanca@bolao.test";
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "Db-Teste-2026!",
      email_confirm: true,
      user_metadata: { full_name: "DB VencedorAvanca Teste" },
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

  const s = await db.query("select id from selecoes order by codigo limit 3");
  [selA, selB, selC] = s.rows.map((r: { id: string }) => r.id);
});

afterAll(async () => {
  if (userIdTeste) await admin.auth.admin.deleteUser(userIdTeste);
  await db.end();
});

beforeEach(async () => {
  await db.query("BEGIN");
  const p = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id, numero)
     values ('oitavas', now() + interval '1 hour', 'Arena', 'agendada', $1, $2, 9001) returning id`,
    [selA, selB],
  );
  partida = p.rows[0].id;
});
afterEach(async () => { await db.query("ROLLBACK"); });

async function inserirPalpite(gm: number, gv: number, avanca: string | null) {
  return db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante, vencedor_avanca)
     values ($1, $2, $3, $4, $5)`,
    [participante, partida, gm, gv, avanca],
  );
}

describe("vencedor_avanca — validação", () => {
  it("aceita null", async () => {
    await expect(inserirPalpite(2, 1, null)).resolves.toBeDefined();
  });
  it("aceita o mandante da partida", async () => {
    await expect(inserirPalpite(1, 1, selA)).resolves.toBeDefined();
  });
  it("aceita o visitante da partida", async () => {
    await expect(inserirPalpite(1, 1, selB)).resolves.toBeDefined();
  });
  it("rejeita seleção que não joga a partida", async () => {
    await expect(inserirPalpite(1, 1, selC)).rejects.toThrow(/vencedor_avanca/);
  });
});
