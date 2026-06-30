/**
 * Testes da trigger avancar_mata_mata() no BANCO local (supabase start).
 *
 * Cada teste usa transação com ROLLBACK para não sujar o cenário.
 * Os jogos inseridos usam números acima de 10000 para nunca colidir com o
 * índice único partidas_numero_uidx (seed usa 73–104).
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#"))
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DB =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

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

/**
 * Insere um jogo do mata-mata simples com mandante/visitante definidos.
 * numero deve ser único dentro da transação (usa valores > 10000).
 */
async function inserirJogo(
  numero: number,
  mandanteId: string,
  visitanteId: string,
  fase = "trinta-e-dois"
): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id, numero)
     values ($1, now() + interval '1 hour', 'Arena Teste', 'agendada', $2, $3, $4)
     returning id`,
    [fase, mandanteId, visitanteId, numero]
  );
  return r.rows[0].id as string;
}

/**
 * Insere um jogo "alvo" cujos lados ainda não têm seleção (aguarda trigger).
 * mandanteLabel / visitanteLabel codificam a topologia (ex: 'W10001').
 */
async function inserirJogoAlvo(
  numero: number,
  mandanteLabel: string,
  visitanteLabel: string,
  fase = "oitavas"
): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, numero, mandante_label, visitante_label)
     values ($1, now() + interval '2 hours', 'Arena Alvo', 'agendada', $2, $3, $4)
     returning id`,
    [fase, numero, mandanteLabel, visitanteLabel]
  );
  return r.rows[0].id as string;
}

async function encerrar(
  jogoId: string,
  golsMandante: number,
  golsVisitante: number,
  vencedorPenaltis: string | null = null
): Promise<void> {
  await db.query(
    `update partidas
        set status = 'encerrada', gols_mandante = $2, gols_visitante = $3, vencedor_penaltis = $4
      where id = $1`,
    [jogoId, golsMandante, golsVisitante, vencedorPenaltis]
  );
}

async function buscarLados(
  jogoId: string
): Promise<{ mandante_id: string | null; visitante_id: string | null }> {
  const r = await db.query("select mandante_id, visitante_id from partidas where id = $1", [
    jogoId,
  ]);
  return r.rows[0];
}

/**
 * Insere um jogo já ENCERRADO via INSERT. Como o trigger de avanço é
 * `after update`, o INSERT não dispara o avanço — reproduz o estado do prod:
 * jogo encerrado antes da 0029, com a fase seguinte ainda nula.
 */
async function inserirJogoEncerrado(
  numero: number,
  mandanteId: string,
  visitanteId: string,
  golsMandante: number,
  golsVisitante: number
): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id, numero, gols_mandante, gols_visitante)
     values ('trinta-e-dois', now() - interval '1 hour', 'Arena Velha', 'encerrada', $1, $2, $3, $4, $5)
     returning id`,
    [mandanteId, visitanteId, numero, golsMandante, golsVisitante]
  );
  return r.rows[0].id as string;
}

describe("avancar_mata_mata — trigger de auto-avanço", () => {
  it("preenche mandante_id do próximo jogo via W{numero}", async () => {
    const fonte = await inserirJogo(10001, selA, selB);
    const alvo = await inserirJogoAlvo(10002, "W10001", "W10003");

    await encerrar(fonte, 2, 1);

    const { mandante_id } = await buscarLados(alvo);
    expect(mandante_id).toBe(selA);
  });

  it("preenche visitante_id do próximo jogo via W{numero}", async () => {
    const fonte = await inserirJogo(10011, selA, selB);
    const alvo = await inserirJogoAlvo(10012, "W10013", "W10011");

    await encerrar(fonte, 1, 3);

    const { visitante_id } = await buscarLados(alvo);
    expect(visitante_id).toBe(selB); // visitante ganhou
  });

  it("empate com vencedor_penaltis avança o vencedor dos pênaltis", async () => {
    const fonte = await inserirJogo(10021, selA, selB);
    const alvo = await inserirJogoAlvo(10022, "W10021", "W10099");

    // empate 1×1, selA vence nos pênaltis
    await encerrar(fonte, 1, 1, selA);

    const { mandante_id } = await buscarLados(alvo);
    expect(mandante_id).toBe(selA);
  });

  it("empate sem vencedor_penaltis não altera o próximo jogo (aguarda correção)", async () => {
    const fonte = await inserirJogo(10031, selA, selB);
    const alvo = await inserirJogoAlvo(10032, "W10031", "W10099");

    await encerrar(fonte, 0, 0, null);

    const { mandante_id } = await buscarLados(alvo);
    expect(mandante_id).toBeNull();
  });

  it("preenche perdedor via L{numero} (jogo de 3º lugar)", async () => {
    const fonte = await inserirJogo(10041, selA, selB);
    const terceiro = await inserirJogoAlvo(10042, "L10041", "L10099", "terceiro-lugar");

    await encerrar(fonte, 3, 0);

    const { mandante_id } = await buscarLados(terceiro);
    // perdedor do jogo 10041 é selB (visitante perdeu)
    expect(mandante_id).toBe(selB);
  });

  it("cadeia semi → 3º lugar + final (W e L do mesmo jogo)", async () => {
    const semi1 = await inserirJogo(10051, selA, selB, "semifinal");
    const semi2 = await inserirJogo(10052, selB, selA, "semifinal");
    const terceiro = await inserirJogoAlvo(10053, "L10051", "L10052", "terceiro-lugar");
    const final_ = await inserirJogoAlvo(10054, "W10051", "W10052", "final");

    // encerrar semi1: selA vence
    await encerrar(semi1, 2, 0);
    let lados = await buscarLados(final_);
    expect(lados.mandante_id).toBe(selA);
    lados = await buscarLados(terceiro);
    expect(lados.mandante_id).toBe(selB); // perdedor de semi1

    // encerrar semi2: selA vence (visitante do semi2)
    await encerrar(semi2, 0, 2);
    lados = await buscarLados(final_);
    expect(lados.visitante_id).toBe(selA);
    lados = await buscarLados(terceiro);
    expect(lados.visitante_id).toBe(selB); // perdedor de semi2
  });

  it("re-encerrar com mesmo placar é idempotente", async () => {
    const fonte = await inserirJogo(10061, selA, selB);
    const alvo = await inserirJogoAlvo(10062, "W10061", "W10099");

    await encerrar(fonte, 2, 0);
    await encerrar(fonte, 2, 0); // re-encerra

    const { mandante_id } = await buscarLados(alvo);
    expect(mandante_id).toBe(selA);
  });

  it("vencedor_penaltis de selecao alheia lanca excecao", async () => {
    const { rows } = await db.query("select id from selecoes order by codigo limit 3");
    const selC = rows[2].id as string; // terceira selecao, nao joga esta partida
    const fonte = await inserirJogo(10081, selA, selB);

    await expect(encerrar(fonte, 0, 0, selC)).rejects.toThrow(/vencedor_penaltis/);
  });

  it("backfill (0032) avança jogos já encerrados que o trigger não tocou", async () => {
    // Reproduz o prod: fonte inserida já encerrada (INSERT não dispara o trigger).
    await inserirJogoEncerrado(10091, selA, selB, 2, 1);
    const alvo = await inserirJogoAlvo(10092, "W10091", "W10099");

    // Confirma o bug: sem o trigger ter disparado, o alvo segue nulo.
    expect((await buscarLados(alvo)).mandante_id).toBeNull();

    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/0032_backfill_avanco_mata_mata.sql"),
      "utf-8"
    );
    await db.query(sql);

    expect((await buscarLados(alvo)).mandante_id).toBe(selA);
  });

  it("partida de grupos (numero null) não dispara avanço", async () => {
    // grupos não têm numero, portanto o trigger deve ser no-op
    const r = await db.query(
      `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
       values ('grupos', now() + interval '1 hour', 'Arena G', 'agendada', $1, $2)
       returning id`,
      [selA, selB]
    );
    const grupoId: string = r.rows[0].id;

    // insere um "alvo" que nunca deveria ser tocado
    const alvo = await inserirJogoAlvo(10071, "Wnull", "Wnull");
    const antesMandante = (await buscarLados(alvo)).mandante_id;

    await encerrar(grupoId, 1, 0);

    const { mandante_id } = await buscarLados(alvo);
    expect(mandante_id).toBe(antesMandante); // inalterado
  });
});
