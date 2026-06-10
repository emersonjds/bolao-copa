import fs from "node:fs";
import path from "node:path";

/**
 * Garante NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no process.env.
 * No CI as vars já vêm do ambiente (secrets); no local, completa o que faltar
 * com o .env.test (mesmo parser dos scripts de cenário). Vars já definidas
 * têm prioridade sobre o arquivo.
 */
export function garantirEnvSupabase(): { url: string; serviceKey: string } {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const envTest = path.join(process.cwd(), ".env.test");
    if (fs.existsSync(envTest)) {
      for (const linha of fs.readFileSync(envTest, "utf-8").split("\n")) {
        const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && !linha.trimStart().startsWith("#")) {
          process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
        }
      }
    }
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (ou crie .env.test)"
    );
  }
  return { url, serviceKey };
}
