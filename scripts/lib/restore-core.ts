import type { SupabaseClient } from "@supabase/supabase-js";
import type { Client } from "pg";
import { ORDEM_INSERCAO, type NomeTabela } from "./backup-core";
import type { Backup, LinhaTabela } from "./backup-schema";

/** Colunas que apontam para auth.users — as únicas remapeadas num projeto novo. */
const CAMPOS_USER: Partial<Record<NomeTabela, readonly string[]>> = {
  profiles: ["id"],
  boloes: ["organizador_id"],
  participantes: ["user_id"],
};

/** Ordem de DELEÇÃO = inserção invertida (filhos antes dos pais nas FKs). */
const ORDEM_DELECAO = [...ORDEM_INSERCAO].reverse();

/**
 * Devolve uma CÓPIA do backup com os ids de usuário trocados pelo mapa
 * (id antigo → id no destino). No mesmo projeto o mapa é identidade e o
 * resultado é idêntico ao original.
 */
export function remapearBackup(backup: Backup, mapa: Map<string, string>): Backup {
  const tabelas = { ...backup.tabelas };
  for (const [tabela, campos] of Object.entries(CAMPOS_USER) as [NomeTabela, readonly string[]][]) {
    tabelas[tabela] = backup.tabelas[tabela].map((linha) => {
      const nova: LinhaTabela = { ...linha };
      for (const campo of campos) {
        const antigo = nova[campo];
        if (antigo === null || antigo === undefined) continue; // organizador_id nulo (bolão da casa)
        const novo = mapa.get(String(antigo));
        if (!novo) {
          throw new Error(`Sem usuário no destino para ${tabela}.${campo}=${String(antigo)}`);
        }
        nova[campo] = novo;
      }
      return nova;
    });
  }
  return { ...backup, tabelas };
}

/**
 * Garante que todo usuário do backup existe no destino, casando por e-mail.
 * Mesmo projeto → ids iguais (mapa identidade). Projeto novo → createUser com
 * e-mail confirmado (o login Google religa pela igualdade de e-mail; o trigger
 * handle_new_user cria profile/participante, substituídos depois pelo wipe+insert).
 */
export async function garantirUsuarios(
  admin: SupabaseClient,
  db: Client,
  authUsers: Backup["auth_users"]
): Promise<Map<string, string>> {
  const { rows } = await db.query<{ id: string; email: string }>(
    "select id, email from auth.users where email is not null"
  );
  const porEmail = new Map(rows.map((linha) => [linha.email.toLowerCase(), linha.id]));

  const mapa = new Map<string, string>();
  for (const usuario of authUsers) {
    let idNovo = porEmail.get(usuario.email.toLowerCase());
    if (!idNovo) {
      const { data, error } = await admin.auth.admin.createUser({
        email: usuario.email,
        email_confirm: true,
      });
      if (error || !data.user) {
        throw new Error(`createUser ${usuario.email} falhou: ${error?.message}`);
      }
      idNovo = data.user.id;
    }
    mapa.set(usuario.id, idNovo);
  }
  return mapa;
}

/** INSERT em lotes com colunas dinâmicas (toda linha do PostgREST tem as mesmas chaves). */
async function inserirTabela(db: Client, tabela: NomeTabela, linhas: LinhaTabela[]): Promise<void> {
  if (linhas.length === 0) return;
  const colunas = Object.keys(linhas[0]);
  const LOTE = 500;
  for (let inicio = 0; inicio < linhas.length; inicio += LOTE) {
    const lote = linhas.slice(inicio, inicio + LOTE);
    const valores: unknown[] = [];
    const placeholders = lote
      .map(
        (linha, li) =>
          `(${colunas
            .map((coluna, ci) => {
              valores.push(linha[coluna] ?? null);
              return `$${li * colunas.length + ci + 1}`;
            })
            .join(", ")})`
      )
      .join(", ");
    await db.query(
      `insert into public.${tabela} (${colunas.map((c) => `"${c}"`).join(", ")}) values ${placeholders}`,
      valores
    );
  }
}

export interface DestinoRestore {
  admin: SupabaseClient;
  db: Client;
}

/**
 * Restaura o backup no destino: garante usuários (por e-mail), remapeia ids,
 * e numa única transação apaga e reinsere as 7 tabelas. Triggers de palpites
 * são desabilitados dentro da transação (a trava do apito bloquearia o INSERT
 * de palpites de jogos já iniciados; `pontos` entra direto do backup — o role
 * postgres é dono da tabela). Qualquer erro → ROLLBACK, banco intacto.
 */
export async function restaurarBackup(backup: Backup, { admin, db }: DestinoRestore): Promise<void> {
  const mapa = await garantirUsuarios(admin, db, backup.auth_users);
  const remapeado = remapearBackup(backup, mapa);

  await db.query("begin");
  try {
    await db.query("alter table public.palpites disable trigger user");
    for (const tabela of ORDEM_DELECAO) {
      await db.query(`delete from public.${tabela}`);
    }
    for (const tabela of ORDEM_INSERCAO) {
      await inserirTabela(db, tabela, remapeado.tabelas[tabela]);
    }
    for (const [tabela, esperado] of Object.entries(backup.contagens)) {
      const { rows } = await db.query<{ n: number }>(
        `select count(*)::int as n from public.${tabela}`
      );
      if (rows[0].n !== esperado) {
        throw new Error(`Contagem divergente em ${tabela}: ${rows[0].n} ≠ ${esperado}`);
      }
    }
    await db.query("alter table public.palpites enable trigger user");
    await db.query("commit");
  } catch (erro) {
    await db.query("rollback");
    throw erro;
  }
}
