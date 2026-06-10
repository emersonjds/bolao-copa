/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Restaura um backup JSON no Supabase de destino. DESTRUTIVO: apaga e reinsere
 * as 7 tabelas públicas (transacional — erro no meio = banco intacto).
 *
 * Uso:
 *   pnpm restore backups/2026-06-15.json                       (local)
 *   DATABASE_URL=<pooler> pnpm restore arquivo.json --prod      (prod: pede confirmação)
 *   ... --force                                                 (ignora divergência de schema_version)
 *
 * Projeto novo: rode `supabase db push` (migrations) ANTES. Quem entrou no
 * bolão DEPOIS do backup não está no arquivo — volta ao logar de novo (trigger
 * de auto-inscrição), mas os palpites pós-backup se perdem (snapshot é point-in-time).
 */
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import fs from "node:fs";
import readline from "node:readline/promises";
import { garantirEnvSupabase } from "./lib/env";
import { backupSchema, schemaVersionDoRepo, type Backup } from "./lib/backup-schema";
import { restaurarBackup } from "./lib/restore-core";
import type { LinhaRanking } from "./lib/backup-core";

async function confirmarProd(url: string, backup: Backup): Promise<void> {
  console.log(`\n⚠️  Vai APAGAR e substituir TODOS os dados de ${url}`);
  console.log(`   pelo backup de ${backup.gerado_em} (${backup.contagens.palpites} palpites).`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await rl.question('   Digite "RESTAURAR" para continuar: ');
  rl.close();
  if (resposta.trim() !== "RESTAURAR") throw new Error("ABORTADO pelo usuário.");
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  const arquivo = args.find((arg) => !arg.startsWith("--"));
  if (!arquivo) throw new Error("Uso: pnpm restore <arquivo.json> [--prod] [--force]");

  const { url, serviceKey } = garantirEnvSupabase();
  const ehLocal = url.includes("127.0.0.1") || url.includes("localhost");
  if (!ehLocal && !flags.has("--prod")) {
    throw new Error(`ABORTADO: ${url} não é local. Use --prod para restaurar em produção.`);
  }

  const backup = backupSchema.parse(JSON.parse(fs.readFileSync(arquivo, "utf-8")));

  const versaoRepo = schemaVersionDoRepo();
  if (backup.schema_version !== versaoRepo && !flags.has("--force")) {
    throw new Error(
      `ABORTADO: backup é do schema ${backup.schema_version}, repo está em ${versaoRepo}. ` +
        `Faça checkout do commit compatível ou use --force.`
    );
  }

  if (!ehLocal) await confirmarProd(url, backup);

  const dbUrl =
    process.env.DATABASE_URL ??
    (ehLocal ? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" : null);
  if (!dbUrl) {
    throw new Error("Defina DATABASE_URL (connection string do Postgres de destino — pooler do dashboard).");
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const db = new Client({ connectionString: dbUrl });
  await db.connect();
  try {
    console.log(`→ restaurando ${arquivo} em ${url}…`);
    await restaurarBackup(backup, { admin, db });
  } finally {
    await db.end();
  }

  const { data: ranking, error: erroRanking } = await admin.rpc("get_ranking");
  if (erroRanking) throw new Error(`get_ranking pós-restore falhou: ${erroRanking.message}`);
  console.log("\n🏆 Ranking pós-restauração:");
  for (const [indice, linha] of (ranking as LinhaRanking[]).entries()) {
    console.log(`  ${indice + 1}º ${linha.nome.padEnd(20)} ${linha.pontos_totais} pts`);
  }
  console.log("\n✅ Restauração concluída.");
}

main().catch((erro: Error) => {
  console.error("❌", erro.message);
  process.exit(1);
});
