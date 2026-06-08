/**
 * Testes da mecânica "palpite dia a dia": janela [meia-noite BRT, kickoff).
 * Bate no Postgres LOCAL (supabase start). Valida as funções
 * janela_palpite_inicio / janela_inicio e a borda inferior do trigger
 * enforce_palpite_lock adicionada na migração 0019.
 *
 * Cada teste cria partida+palpite numa transação e dá ROLLBACK no fim.
 * Usa participante dedicado (email diferente de apurar-pontos) para não colidir.
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
  // Participante de teste dedicado — email diferente de apurar-pontos para não colidir.
  const email = "dbtest-janela@bolao.test";
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "Db-Teste-2026!",
      email_confirm: true,
      user_metadata: { full_name: "DB Janela Teste" },
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
  if (userIdTeste) await admin.auth.admin.deleteUser(userIdTeste);
  await db.end();
});

beforeEach(async () => {
  await db.query("BEGIN");
});
afterEach(async () => {
  await db.query("ROLLBACK");
});

// AVISO: dataHoraSql é interpolado diretamente no SQL — use apenas literais confiáveis, nunca input externo.
/** Insere uma partida com data_hora explícita e devolve o id. */
async function partidaEm(dataHoraSql: string): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
     values ('grupos', ${dataHoraSql}, 'Estádio Teste', 'agendada', $1, $2) returning id`,
    [selA, selB]
  );
  return r.rows[0].id;
}

async function palpita(partida: string): Promise<void> {
  await db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante) values ($1,$2,1,0)`,
    [participanteId, partida]
  );
}

describe("janela_palpite_inicio — meia-noite BRT do dia do jogo", () => {
  it("jogo às 22h BRT vira meia-noite do mesmo dia BRT", async () => {
    const r = await db.query<{ ini: string }>(
      "select to_char(public.janela_palpite_inicio('2026-06-15 22:00:00-03'::timestamptz) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as ini"
    );
    expect(r.rows[0].ini).toBe("2026-06-15 00:00");
  });
  it("jogo 21h em Los Angeles (UTC-7) = 01h BRT do dia seguinte → janela abre meia-noite BRT desse dia seguinte", async () => {
    const r = await db.query<{ ini: string }>(
      "select to_char(public.janela_palpite_inicio('2026-06-15 21:00:00-07'::timestamptz) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as ini"
    );
    expect(r.rows[0].ini).toBe("2026-06-16 00:00");
  });
});

describe("enforce_palpite_lock — borda inferior (dia a dia)", () => {
  it("recusa palpite ANTES da janela (jogo daqui a 10 dias)", async () => {
    const p = await partidaEm("now() + interval '10 days'");
    await expect(palpita(p)).rejects.toThrow(/nao_liberado|não liberado|abrem no dia/i);
  });
  it("aceita palpite DENTRO da janela (jogo hoje, 1h no futuro)", async () => {
    const p = await partidaEm("now() + interval '1 hour'");
    await expect(palpita(p)).resolves.toBeUndefined();
  });
  it("recusa palpite DEPOIS do apito (borda superior, sem regressão)", async () => {
    const p = await partidaEm("now() - interval '1 hour'");
    await expect(palpita(p)).rejects.toThrow(/encerrado|começou/i);
  });
  it("recusa UPDATE que muda gols ANTES da janela", async () => {
    // cria a partida HOJE (janela aberta), insere o palpite, depois empurra a
    // data_hora pra 10 dias no futuro (janela fecha) e tenta editar os gols.
    const p = await partidaEm("now() + interval '1 hour'");
    await palpita(p); // 1x0, dentro da janela → ok
    await db.query("update partidas set data_hora = now() + interval '10 days' where id=$1", [p]);
    await expect(
      db.query("update palpites set gols_mandante=3 where participante_id=$1 and partida_id=$2", [
        participanteId,
        p,
      ])
    ).rejects.toThrow(/nao_liberado|não liberado|abrem no dia/i);
  });
});

describe("coluna computada janela_inicio", () => {
  it("expõe janela_inicio coerente com a função", async () => {
    const p = await partidaEm("'2026-06-20 18:00:00-03'::timestamptz");
    const r = await db.query<{ a: string; b: string }>(
      `select to_char(public.janela_inicio(pa.*) at time zone 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') a,
              to_char(public.janela_palpite_inicio(pa.data_hora) at time zone 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') b
       from partidas pa where pa.id=$1`,
      [p]
    );
    expect(r.rows[0].a).toBe(r.rows[0].b);
    expect(r.rows[0].a).toBe("2026-06-20 00:00");
  });
});
