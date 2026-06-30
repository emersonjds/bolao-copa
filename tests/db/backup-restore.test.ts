/**
 * Round-trip do backup: gera → APAGA TUDO → restaura → gera de novo → idêntico.
 * DESTRUTIVO no banco local (e auto-restaurador: o estado final = inicial).
 * Pré-requisito: supabase start + pnpm scenario:seed (precisa de dados reais).
 * Anti-prod: aborta se a URL não for local (mesmo guard dos scripts de cenário).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { gerarBackup } from "../../scripts/lib/backup-core";
import { restaurarBackup } from "../../scripts/lib/restore-core";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#"))
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPA_URL.includes("127.0.0.1") && !SUPA_URL.includes("localhost")) {
  throw new Error(`ABORTADO: ${SUPA_URL} não é local. Este teste apaga e restaura o banco.`);
}

const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });
const db = new Client({ connectionString: DB });

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.end();
});

describe("backup → wipe → restore (round-trip)", () => {
  it("restaura o banco exatamente como estava", async () => {
    const antes = await gerarBackup(admin);
    expect(antes.contagens.participantes, "rode `pnpm scenario:seed` antes").toBeGreaterThan(0);
    expect(antes.contagens.palpites, "rode `pnpm scenario:seed` antes").toBeGreaterThan(0);

    await restaurarBackup(antes, { admin, db });
    const depois = await gerarBackup(admin);

    expect(depois.contagens).toEqual(antes.contagens);
    expect(depois.tabelas).toEqual(antes.tabelas);
    expect(depois.ranking).toEqual(antes.ranking);
    expect(depois.auth_users).toEqual(antes.auth_users);
  }, 120_000);

  it("é idempotente — restaurar duas vezes dá no mesmo", async () => {
    const antes = await gerarBackup(admin);
    await restaurarBackup(antes, { admin, db });
    await restaurarBackup(antes, { admin, db });
    const depois = await gerarBackup(admin);
    expect(depois.tabelas).toEqual(antes.tabelas);
    expect(depois.ranking).toEqual(antes.ranking);
  }, 120_000);

  it("a trava de palpites volta a funcionar depois da restauração", async () => {
    // O restore desabilita triggers de palpites na transação; aqui provamos
    // que voltaram: INSERT num jogo fora da janela tem que explodir na trava
    // (no cenário seed os jogos "encerrada" têm data_hora futura — antes do
    // dia da partida a trava barra com `palpite_nao_liberado`; já começado,
    // com `Palpite encerrado`. Qualquer uma prova que o trigger voltou).
    const { rows: partidas } = await db.query(
      "select id from partidas where status = 'encerrada' limit 1"
    );
    const { rows: participantes } = await db.query("select id from participantes limit 1");
    await expect(
      db.query(
        `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante)
         values ($1, $2, 1, 1)`,
        [participantes[0].id, partidas[0].id]
      )
    ).rejects.toThrow(/Palpite encerrado|palpite_nao_liberado|janela/i);
  });
});
