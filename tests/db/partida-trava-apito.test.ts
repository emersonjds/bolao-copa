/**
 * Testes da trava 0036: partida não pode ser encerrada nem receber placar antes
 * do apito (now() < data_hora). Bate no Postgres LOCAL (supabase start) como
 * superuser — o trigger dispara para qualquer role. Cada teste roda numa
 * transação com ROLLBACK.
 */
import { afterAll, beforeAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#"))
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const db = new Client({ connectionString: DB });
let selA: string;
let selB: string;

beforeAll(async () => {
  await db.connect();
  const sel = await db.query("select id from selecoes order by codigo limit 2");
  selA = sel.rows[0].id;
  selB = sel.rows[1].id;
});
afterAll(async () => {
  await db.end();
});
beforeEach(async () => {
  await db.query("BEGIN");
});
afterEach(async () => {
  await db.query("ROLLBACK");
});

// dataHoraSql é literal confiável (nunca input externo).
async function partidaEm(dataHoraSql: string): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
     values ('trinta-e-dois', ${dataHoraSql}, 'Estádio Teste', 'agendada', $1, $2) returning id`,
    [selA, selB]
  );
  return r.rows[0].id;
}

describe("0036 — partida não encerra nem recebe placar antes do apito", () => {
  it("recusa marcar 'encerrada' com placar antes do apito", async () => {
    const p = await partidaEm("now() + interval '3 hours'");
    await expect(
      db.query(
        "update partidas set status='encerrada', gols_mandante=3, gols_visitante=1 where id=$1",
        [p]
      )
    ).rejects.toThrow(/antes do início|não começou/i);
  });

  it("recusa lançar placar antes do apito mesmo mantendo 'agendada'", async () => {
    const p = await partidaEm("now() + interval '3 hours'");
    await expect(
      db.query("update partidas set gols_mandante=2, gols_visitante=0 where id=$1", [p])
    ).rejects.toThrow(/antes do início|não começou/i);
  });

  it("aceita editar dados neutros de jogo futuro (segue agendada, sem gols)", async () => {
    const p = await partidaEm("now() + interval '3 hours'");
    await expect(
      db.query("update partidas set estadio='Outro Estádio' where id=$1", [p])
    ).resolves.toBeDefined();
  });

  it("aceita encerrar com placar DEPOIS do apito", async () => {
    const p = await partidaEm("now() - interval '2 hours'");
    await expect(
      db.query(
        "update partidas set status='encerrada', gols_mandante=1, gols_visitante=0 where id=$1",
        [p]
      )
    ).resolves.toBeDefined();
  });
});
