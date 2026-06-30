import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/** Linha genérica de tabela: dump fiel (colunas extras passam), mas `id` é obrigatório. */
const linhaTabela = z.looseObject({ id: z.string() });

export const backupSchema = z.object({
  gerado_em: z.string(),
  schema_version: z.string(),
  contagens: z.record(z.string(), z.number().int().min(0)),
  ranking: z.array(
    z.looseObject({
      posicao: z.number().int().positive(),
      participante_id: z.string(),
      nome: z.string(),
      pontos_totais: z.number().int(),
      jogos_pontuados: z.number().int(),
    })
  ),
  tabelas: z.object({
    profiles: z.array(linhaTabela),
    selecoes: z.array(linhaTabela),
    partidas: z.array(linhaTabela),
    boloes: z.array(linhaTabela),
    participantes: z.array(linhaTabela),
    convites: z.array(linhaTabela),
    palpites: z.array(linhaTabela),
  }),
  auth_users: z.array(z.object({ id: z.string(), email: z.string() })),
});

export type Backup = z.infer<typeof backupSchema>;
export type LinhaTabela = z.infer<typeof linhaTabela>;

/** Data de "hoje" no fuso do bolão (America/Sao_Paulo), formato YYYY-MM-DD. */
export function dataBrtHoje(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/** Prefixo da última migration do repo (ex.: "0019") — gravado no backup pra detectar incompatibilidade na restauração. */
export function schemaVersionDoRepo(
  dirMigrations = path.join(process.cwd(), "supabase", "migrations")
): string {
  const ultima = fs
    .readdirSync(dirMigrations)
    .filter((arquivo) => arquivo.endsWith(".sql"))
    .sort()
    .at(-1);
  if (!ultima) throw new Error(`Nenhuma migration encontrada em ${dirMigrations}`);
  return ultima.slice(0, 4);
}

/** Backup com essas tabelas zeradas é lixo — melhor falhar barulhento que arquivar. */
const TABELAS_ESSENCIAIS = ["profiles", "participantes", "partidas", "palpites"] as const;

export function tabelasEssenciaisVazias(contagens: Record<string, number>): string[] {
  return TABELAS_ESSENCIAIS.filter((tabela) => (contagens[tabela] ?? 0) === 0);
}
