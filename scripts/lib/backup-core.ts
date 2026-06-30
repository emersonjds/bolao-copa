import type { SupabaseClient } from "@supabase/supabase-js";
import {
  backupSchema,
  schemaVersionDoRepo,
  tabelasEssenciaisVazias,
  type Backup,
} from "./backup-schema";

/** Ordem de INSERÇÃO respeitando FKs (palpites → participantes/partidas; participantes/convites → boloes; partidas → selecoes). */
export const ORDEM_INSERCAO = [
  "profiles",
  "boloes",
  "selecoes",
  "partidas",
  "participantes",
  "convites",
  "palpites",
] as const;
export type NomeTabela = (typeof ORDEM_INSERCAO)[number];

export interface LinhaRanking {
  participante_id: string;
  nome: string;
  avatar_url: string | null;
  pontos_totais: number;
  jogos_pontuados: number;
}

/** Teto de linhas por resposta do PostgREST (config padrão do Supabase). */
const PAGINA = 1000;

export async function lerTabelaCompleta(
  admin: SupabaseClient,
  tabela: NomeTabela
): Promise<Record<string, unknown>[]> {
  const linhas: Record<string, unknown>[] = [];
  for (let inicio = 0; ; inicio += PAGINA) {
    const { data, error } = await admin
      .from(tabela)
      .select("*")
      .order("id")
      .range(inicio, inicio + PAGINA - 1);
    if (error) throw new Error(`Falha ao ler ${tabela}: ${error.message}`);
    linhas.push(...((data as Record<string, unknown>[]) ?? []));
    if (!data || data.length < PAGINA) break;
  }
  return linhas;
}

/** Extrato mínimo do Auth (id + e-mail) — sem ele não há como religar palpites aos donos num projeto novo. */
export async function listarAuthUsers(
  admin: SupabaseClient
): Promise<{ id: string; email: string }[]> {
  const usuarios: { id: string; email: string }[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: PAGINA });
    if (error) throw new Error(`Falha ao listar auth.users: ${error.message}`);
    for (const usuario of data.users) {
      if (!usuario.email) {
        throw new Error(`Usuário ${usuario.id} sem e-mail — impossível religar na restauração`);
      }
      usuarios.push({ id: usuario.id, email: usuario.email });
    }
    if (data.users.length < PAGINA) break;
  }
  return usuarios.sort((a, b) => a.email.localeCompare(b.email));
}

export async function gerarBackup(admin: SupabaseClient, agora = new Date()): Promise<Backup> {
  const tabelas: Record<string, Record<string, unknown>[]> = {};
  for (const tabela of ORDEM_INSERCAO) {
    tabelas[tabela] = await lerTabelaCompleta(admin, tabela);
  }

  const { data: rankingBruto, error: erroRanking } = await admin.rpc("get_ranking");
  if (erroRanking) throw new Error(`get_ranking falhou: ${erroRanking.message}`);
  const ranking = (rankingBruto as LinhaRanking[]).map((linha, indice) => ({
    posicao: indice + 1,
    ...linha,
  }));

  const auth_users = await listarAuthUsers(admin);

  const contagens = Object.fromEntries(
    Object.entries(tabelas).map(([tabela, linhas]) => [tabela, linhas.length])
  );
  const vazias = tabelasEssenciaisVazias(contagens);
  if (vazias.length > 0) {
    throw new Error(`ABORTADO: tabelas essenciais vazias: ${vazias.join(", ")}`);
  }

  return backupSchema.parse({
    gerado_em: agora.toISOString(),
    schema_version: schemaVersionDoRepo(),
    contagens,
    ranking,
    tabelas,
    auth_users,
  });
}
