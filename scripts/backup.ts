/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Exporta o snapshot diário do bolão em JSON (prova + restauração).
 * Lê o Supabase apontado por NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * (no local, cai no .env.test). Leitura pura — seguro contra qualquer ambiente.
 *
 * Uso: pnpm backup [dirSaida]        (padrão: backups/)
 * Spec: docs/superpowers/specs/2026-06-10-backup-diario-json-design.md
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { garantirEnvSupabase } from "./lib/env";
import { gerarBackup } from "./lib/backup-core";
import { dataBrtHoje } from "./lib/backup-schema";

async function main() {
  const { url, serviceKey } = garantirEnvSupabase();
  const dirSaida = process.argv[2] ?? "backups";
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`→ gerando backup de ${url}…`);
  const backup = await gerarBackup(admin);

  fs.mkdirSync(dirSaida, { recursive: true });
  const arquivo = path.join(dirSaida, `${dataBrtHoje()}.json`);
  fs.writeFileSync(arquivo, JSON.stringify(backup, null, 2) + "\n");

  console.log(`\n📦 Contagens:`);
  for (const [tabela, total] of Object.entries(backup.contagens)) {
    console.log(`  ${tabela.padEnd(14)} ${total}`);
  }
  console.log(`  auth_users     ${backup.auth_users.length}`);
  console.log(`\n✅ ${arquivo} (schema ${backup.schema_version})`);
}

main().catch((erro: Error) => {
  console.error("❌", erro.message);
  process.exit(1);
});
