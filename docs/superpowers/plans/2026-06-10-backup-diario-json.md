# Backup diário em JSON — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Backup diário e automático de todos os dados do bolão em um JSON por dia (prova + restauração), via GitHub Actions no repo privado `emersonjds/backup-bolao-da-copa`, com script de restauração testado em round-trip no Supabase local.

**Architecture:** O código (export + restore) mora em `scripts/` do `bolao-copa`, no padrão dos scripts existentes (tsx + `@supabase/supabase-js` com service_role + `pg` para operações privilegiadas). O workflow do Actions mora no repo privado de backup, que faz checkout do `bolao-copa` público, roda o script e commita `backups/YYYY-MM-DD.json` em si mesmo. A restauração é unificada: garante os usuários por e-mail (mesmo projeto → mapa identidade; projeto novo → `createUser` + remap), apaga e reinsere as 7 tabelas numa transação com triggers de `palpites` desabilitados.

**Tech Stack:** TypeScript (tsx), `@supabase/supabase-js` v2, `pg`, Zod v4, Vitest (camada `test:db`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-06-10-backup-diario-json-design.md`

**Pré-requisitos de execução:** `supabase start` rodando + `pnpm scenario:seed` aplicado (necessário nas Tasks 4 e 7).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
| --- | --- |
| `scripts/lib/env.ts` (novo) | Carregar `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` do ambiente (CI) com fallback no `.env.test` (local) |
| `scripts/lib/backup-schema.ts` (novo) | Schema Zod do JSON de backup + helpers puros (data BRT, versão do schema, checagem de tabelas vazias) |
| `scripts/lib/backup-schema.test.ts` (novo) | Testes unitários dos helpers e do schema |
| `scripts/lib/backup-core.ts` (novo) | `gerarBackup()`: leitura paginada das 7 tabelas, ranking via RPC, extrato do auth — importável pelos testes |
| `scripts/lib/backup-core.test.ts` (novo) | Testes unitários com cliente Supabase fake (paginação, abort em tabela vazia) |
| `scripts/backup.ts` (novo) | CLI `pnpm backup [dirSaida]` — só I/O: env, gera, grava arquivo |
| `scripts/lib/restore-core.ts` (novo) | `remapearBackup()` (pura) + `garantirUsuarios()` + `restaurarBackup()` (transação pg) |
| `scripts/lib/restore-core.test.ts` (novo) | Testes unitários do remap (pura, sem banco) |
| `scripts/restore.ts` (novo) | CLI `pnpm restore <arquivo>` — guards `--prod`/`--force` + confirmação digitada |
| `tests/db/backup-restore.test.ts` (novo) | Round-trip no banco local: backup → wipe → restore → backup idêntico + idempotência |
| `package.json` (modificar) | Scripts `backup` e `restore` |
| `docs/PROJETO.md` (modificar) | Seção de backup no handbook (§4 e §10) |
| Repo privado: `.github/workflows/backup.yml` + `README.md` (novos) | Cron diário 06:00 UTC + instruções de secrets/restauração |

Notas de contexto pro implementador (verificadas no código atual):

- Tabelas e colunas: `profiles` (id, nome, avatar_url, created_at, is_admin), `selecoes` (id, nome, codigo), `partidas` (id, fase, grupo, data_hora, estadio, status, mandante_id, visitante_id, gols_mandante, gols_visitante, created_at, mandante_label, visitante_label, vencedor_penaltis, rodada), `boloes` (id, nome, organizador_id nullable, created_at), `participantes` (id, bolao_id, user_id, created_at), `convites` (id, bolao_id, token, expira_em, created_at), `palpites` (id, participante_id, partida_id, gols_mandante, gols_visitante, pontos, created_at, updated_at).
- `get_ranking()` (migration 0017) retorna `participante_id, nome, avatar_url, pontos_totais, jogos_pontuados`.
- `handle_new_user` (0004) cria `profiles` **e** `participantes` no bolão fixo `00000000-0000-0000-0000-000000000b01` — por isso a restauração apaga e reinsere essas tabelas DEPOIS de garantir os usuários.
- `enforce_palpite_lock` (0001/0019) bloqueia INSERT em `palpites` de partidas já iniciadas — por isso a restauração desabilita triggers de `palpites` (`ALTER TABLE ... DISABLE TRIGGER USER`) dentro da transação. O role `postgres` é dono das tabelas e tem bypass de RLS, tanto no local quanto no cloud.
- PostgREST limita respostas a 1000 linhas — leitura **precisa** paginar (`.range()`); `palpites` já pode passar de 1000 (ex.: 14 participantes × 104 jogos).
- Coverage do vitest principal só conta `src/**` — os testes de `scripts/**` rodam (`include` do vitest.config.ts) mas não afetam o threshold.
- Testes unitários em `scripts/lib/` levam `// @vitest-environment node` na primeira linha (padrão de `scripts/lib/transform.test.ts`).

---

### Task 1: Helper de ambiente (`scripts/lib/env.ts`)

**Files:**
- Create: `scripts/lib/env.ts`

- [ ] **Step 1: Criar o helper**

```ts
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
```

- [ ] **Step 2: Verificar tipos e commitar**

Run: `pnpm type-check`
Expected: sem erros.

```bash
git add scripts/lib/env.ts
git commit -m "add supabase env helper for backup scripts"
```

---

### Task 2: Schema Zod + helpers puros (`scripts/lib/backup-schema.ts`)

**Files:**
- Create: `scripts/lib/backup-schema.test.ts`
- Create: `scripts/lib/backup-schema.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  backupSchema,
  dataBrtHoje,
  schemaVersionDoRepo,
  tabelasEssenciaisVazias,
} from "./backup-schema";

describe("dataBrtHoje", () => {
  it("formata a data no fuso de São Paulo (YYYY-MM-DD)", () => {
    // 02:30 UTC do dia 16 ainda é dia 15 às 23:30 em BRT (UTC-3)
    expect(dataBrtHoje(new Date("2026-06-16T02:30:00Z"))).toBe("2026-06-15");
    // 06:00 UTC (horário do cron) já é dia 16 às 03:00 em BRT
    expect(dataBrtHoje(new Date("2026-06-16T06:00:00Z"))).toBe("2026-06-16");
  });
});

describe("schemaVersionDoRepo", () => {
  it("retorna o prefixo numérico da última migration", () => {
    expect(schemaVersionDoRepo()).toMatch(/^\d{4}$/);
  });
});

describe("tabelasEssenciaisVazias", () => {
  it("aponta as essenciais zeradas", () => {
    expect(
      tabelasEssenciaisVazias({ profiles: 5, participantes: 0, partidas: 104, palpites: 0 })
    ).toEqual(["participantes", "palpites"]);
  });
  it("retorna vazio quando tudo tem linhas", () => {
    expect(
      tabelasEssenciaisVazias({ profiles: 1, participantes: 1, partidas: 1, palpites: 1 })
    ).toEqual([]);
  });
});

describe("backupSchema", () => {
  it("rejeita linha de tabela sem id", () => {
    const resultado = backupSchema.safeParse({
      gerado_em: "2026-06-10T06:00:00.000Z",
      schema_version: "0019",
      contagens: { profiles: 1 },
      ranking: [],
      tabelas: {
        profiles: [{ nome: "sem id" }],
        selecoes: [],
        partidas: [],
        boloes: [],
        participantes: [],
        convites: [],
        palpites: [],
      },
      auth_users: [],
    });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run scripts/lib/backup-schema.test.ts`
Expected: FAIL — módulo `./backup-schema` não existe.

- [ ] **Step 3: Implementar**

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run scripts/lib/backup-schema.test.ts`
Expected: 5 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/backup-schema.ts scripts/lib/backup-schema.test.ts
git commit -m "add backup JSON schema and pure helpers"
```

---

### Task 3: Núcleo do export (`scripts/lib/backup-core.ts`)

**Files:**
- Create: `scripts/lib/backup-core.test.ts`
- Create: `scripts/lib/backup-core.ts`

- [ ] **Step 1: Escrever os testes que falham (cliente Supabase fake)**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gerarBackup, lerTabelaCompleta } from "./backup-core";

type Linha = Record<string, unknown>;

/** Fake mínimo do supabase-js: cada chamada a range() devolve a próxima página. */
function clienteFake(opcoes: {
  paginasPorTabela?: Record<string, Linha[][]>;
  linhasPorTabela?: Record<string, Linha[]>;
  ranking?: Linha[];
  authUsers?: { id: string; email: string }[];
}): SupabaseClient {
  const cursores: Record<string, number> = {};
  return {
    from: (tabela: string) => ({
      select: () => ({
        order: () => ({
          range: async () => {
            if (opcoes.paginasPorTabela?.[tabela]) {
              const pagina = cursores[tabela] ?? 0;
              cursores[tabela] = pagina + 1;
              return { data: opcoes.paginasPorTabela[tabela][pagina] ?? [], error: null };
            }
            const linhas = opcoes.linhasPorTabela?.[tabela] ?? [];
            const pagina = cursores[tabela] ?? 0;
            cursores[tabela] = pagina + 1;
            return { data: pagina === 0 ? linhas : [], error: null };
          },
        }),
      }),
    }),
    rpc: async () => ({ data: opcoes.ranking ?? [], error: null }),
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: opcoes.authUsers ?? [] }, error: null }),
      },
    },
  } as unknown as SupabaseClient;
}

const LINHAS_MINIMAS: Record<string, Linha[]> = {
  profiles: [{ id: "u1", nome: "Ana" }],
  selecoes: [{ id: "s1", nome: "Brasil", codigo: "BRA" }],
  partidas: [{ id: "pt1", fase: "grupos" }],
  boloes: [{ id: "b1", organizador_id: null }],
  participantes: [{ id: "pa1", user_id: "u1", bolao_id: "b1" }],
  convites: [],
  palpites: [{ id: "pp1", participante_id: "pa1", partida_id: "pt1", pontos: 5 }],
};

describe("lerTabelaCompleta", () => {
  it("pagina além do limite de 1000 linhas do PostgREST", async () => {
    const pagina1 = Array.from({ length: 1000 }, (_, i) => ({ id: `a${i}` }));
    const pagina2 = [{ id: "b1" }];
    const linhas = await lerTabelaCompleta(
      clienteFake({ paginasPorTabela: { palpites: [pagina1, pagina2] } }),
      "palpites"
    );
    expect(linhas).toHaveLength(1001);
  });
});

describe("gerarBackup", () => {
  it("monta o JSON completo: tabelas, contagens, ranking com posição e auth_users", async () => {
    const backup = await gerarBackup(
      clienteFake({
        linhasPorTabela: LINHAS_MINIMAS,
        ranking: [
          { participante_id: "pa1", nome: "Ana", avatar_url: null, pontos_totais: 5, jogos_pontuados: 1 },
        ],
        authUsers: [{ id: "u1", email: "ana@bolao.test" }],
      })
    );
    expect(backup.contagens).toEqual({
      profiles: 1, selecoes: 1, partidas: 1, boloes: 1, participantes: 1, convites: 0, palpites: 1,
    });
    expect(backup.ranking[0]).toMatchObject({ posicao: 1, nome: "Ana", pontos_totais: 5 });
    expect(backup.auth_users).toEqual([{ id: "u1", email: "ana@bolao.test" }]);
    expect(backup.schema_version).toMatch(/^\d{4}$/);
  });

  it("aborta se tabela essencial vier vazia", async () => {
    await expect(
      gerarBackup(clienteFake({ linhasPorTabela: { ...LINHAS_MINIMAS, palpites: [] } }))
    ).rejects.toThrow(/tabelas essenciais vazias: palpites/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run scripts/lib/backup-core.test.ts`
Expected: FAIL — módulo `./backup-core` não existe.

- [ ] **Step 3: Implementar**

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run scripts/lib/backup-core.test.ts`
Expected: 3 testes PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/backup-core.ts scripts/lib/backup-core.test.ts
git commit -m "add backup export core with postgrest pagination"
```

---

### Task 4: CLI do backup (`scripts/backup.ts` + `pnpm backup`)

**Files:**
- Create: `scripts/backup.ts`
- Modify: `package.json` (bloco `scripts`)

- [ ] **Step 1: Criar o CLI**

```ts
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
```

- [ ] **Step 2: Registrar o script no package.json**

Em `package.json`, logo após `"scenario:open": "tsx scripts/dev-login.ts",` adicionar:

```json
    "backup": "tsx scripts/backup.ts",
```

- [ ] **Step 3: Verificar manualmente contra o local**

Pré-requisito: `supabase start` + `pnpm scenario:seed`.

Run: `pnpm backup`
Expected: tabela de contagens (palpites > 0) e `✅ backups/2026-06-10.json (schema 0019)`.

Run: `node -e "const b=require('./backups/$(ls backups | tail -1)'); console.log(b.ranking.slice(0,3)); console.log(Object.keys(b.tabelas))"`
Expected: 3 primeiras posições do ranking com `posicao`, `nome`, `pontos_totais`; as 7 tabelas listadas.

- [ ] **Step 4: Garantir que backups locais não entram no repo público**

Adicionar ao `.gitignore` do bolao-copa (seção de artefatos locais):

```
# backups locais de teste (os reais vivem no repo privado backup-bolao-da-copa)
/backups/
```

- [ ] **Step 5: Verificações e commit**

Run: `pnpm type-check && pnpm lint`
Expected: sem erros.

```bash
git add scripts/backup.ts package.json .gitignore
git commit -m "add daily backup CLI"
```

---

### Task 5: Núcleo da restauração (`scripts/lib/restore-core.ts`)

**Files:**
- Create: `scripts/lib/restore-core.test.ts`
- Create: `scripts/lib/restore-core.ts`

- [ ] **Step 1: Escrever os testes do remap (puros) que falham**

```ts
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { remapearBackup } from "./restore-core";
import { backupSchema, type Backup } from "./backup-schema";

function backupMinimo(): Backup {
  return backupSchema.parse({
    gerado_em: "2026-06-10T06:00:00.000Z",
    schema_version: "0019",
    contagens: { profiles: 1, participantes: 1, partidas: 1, palpites: 1 },
    ranking: [],
    tabelas: {
      profiles: [{ id: "user-velho", nome: "Ana" }],
      selecoes: [],
      partidas: [{ id: "pt1" }],
      boloes: [
        { id: "b1", organizador_id: null },
        { id: "b2", organizador_id: "user-velho" },
      ],
      participantes: [{ id: "pa1", user_id: "user-velho", bolao_id: "b1" }],
      convites: [],
      palpites: [{ id: "pp1", participante_id: "pa1" }],
    },
    auth_users: [{ id: "user-velho", email: "ana@bolao.test" }],
  });
}

describe("remapearBackup", () => {
  it("troca os ids de usuário em profiles.id, participantes.user_id e boloes.organizador_id", () => {
    const mapa = new Map([["user-velho", "user-novo"]]);
    const remapeado = remapearBackup(backupMinimo(), mapa);
    expect(remapeado.tabelas.profiles[0].id).toBe("user-novo");
    expect(remapeado.tabelas.participantes[0].user_id).toBe("user-novo");
    expect(remapeado.tabelas.boloes[1].organizador_id).toBe("user-novo");
  });

  it("preserva organizador_id nulo e não toca em palpites/partidas", () => {
    const remapeado = remapearBackup(backupMinimo(), new Map([["user-velho", "user-novo"]]));
    expect(remapeado.tabelas.boloes[0].organizador_id).toBeNull();
    expect(remapeado.tabelas.palpites[0].participante_id).toBe("pa1");
    expect(remapeado.tabelas.partidas[0].id).toBe("pt1");
  });

  it("não muta o backup original (mesmo projeto usa o original intacto)", () => {
    const original = backupMinimo();
    remapearBackup(original, new Map([["user-velho", "user-novo"]]));
    expect(original.tabelas.profiles[0].id).toBe("user-velho");
  });

  it("explode se faltar mapeamento pra algum usuário", () => {
    expect(() => remapearBackup(backupMinimo(), new Map())).toThrow(/Sem usuário no destino/);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run scripts/lib/restore-core.test.ts`
Expected: FAIL — módulo `./restore-core` não existe.

- [ ] **Step 3: Implementar o restore-core completo**

```ts
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
        if (antigo == null) continue; // organizador_id nulo (bolão da casa)
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run scripts/lib/restore-core.test.ts`
Expected: 4 testes PASS.

Run: `pnpm type-check`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/restore-core.ts scripts/lib/restore-core.test.ts
git commit -m "add restore core with email-based user remapping"
```

---

### Task 6: CLI da restauração (`scripts/restore.ts` + `pnpm restore`)

**Files:**
- Create: `scripts/restore.ts`
- Modify: `package.json` (bloco `scripts`)

- [ ] **Step 1: Criar o CLI com guards**

```ts
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
```

- [ ] **Step 2: Registrar o script no package.json**

Em `package.json`, logo após a linha `"backup": "tsx scripts/backup.ts",` adicionar:

```json
    "restore": "tsx scripts/restore.ts",
```

- [ ] **Step 3: Verificar os guards manualmente**

Run: `pnpm restore`
Expected: `❌ Uso: pnpm restore <arquivo.json> [--prod] [--force]` (exit 1).

Run: `NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.co SUPABASE_SERVICE_ROLE_KEY=x pnpm restore backups/qualquer.json`
Expected: `❌ ABORTADO: https://fake.supabase.co não é local. Use --prod para restaurar em produção.`

- [ ] **Step 4: Verificações e commit**

Run: `pnpm type-check && pnpm lint`
Expected: sem erros.

```bash
git add scripts/restore.ts package.json
git commit -m "add restore CLI with prod and schema guards"
```

---

### Task 7: Round-trip no banco local (`tests/db/backup-restore.test.ts`)

**Files:**
- Create: `tests/db/backup-restore.test.ts`

- [ ] **Step 1: Escrever o teste de round-trip**

```ts
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
    // que voltaram: INSERT em partida já iniciada tem que explodir na trava.
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
    ).rejects.toThrow(/Palpite encerrado|janela/i);
  });
});
```

- [ ] **Step 2: Rodar a suíte de banco completa**

Pré-requisito: `supabase start` + `pnpm scenario:seed`.

Run: `pnpm test:db`
Expected: PASS — 29 testes antigos + 3 novos = 32. Se o round-trip falhar no meio, o ROLLBACK da transação mantém o banco intacto (e `pnpm scenario:seed` reconstrói o cenário em último caso).

- [ ] **Step 3: Commit**

```bash
git add tests/db/backup-restore.test.ts
git commit -m "add backup restore round-trip db tests"
```

---

### Task 8: Workflow + README no repo privado de backup

**Files (no clone local de `git@github.com:emersonjds/backup-bolao-da-copa.git`):**
- Create: `.github/workflows/backup.yml`
- Create: `README.md`

- [ ] **Step 1: Clonar o repo privado ao lado do projeto**

```bash
git clone git@github.com:emersonjds/backup-bolao-da-copa.git /Users/emerson/Documents/workspace/projects/backup-bolao-da-copa
```

(Se já existir, só `git -C /Users/emerson/Documents/workspace/projects/backup-bolao-da-copa pull`.)

- [ ] **Step 2: Criar `.github/workflows/backup.yml`**

```yaml
name: backup-diario

on:
  schedule:
    - cron: "0 6 * * *" # 06:00 UTC = 03:00 BRT, depois do último jogo do dia
  workflow_dispatch: # disparo manual pra rodar fora de hora

permissions:
  contents: write

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      # este repo (onde os JSONs são commitados)
      - uses: actions/checkout@v4

      # o código do app (script de backup vive lá, junto das migrations)
      - uses: actions/checkout@v4
        with:
          repository: emersonjds/bolao-copa
          path: app

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: app/pnpm-lock.yaml

      - run: pnpm install --frozen-lockfile
        working-directory: app

      - name: gerar o backup do dia
        run: pnpm exec tsx scripts/backup.ts ../backups
        working-directory: app
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}

      - name: commitar o backup do dia
        run: |
          git config user.name "backup-bot"
          git config user.email "actions@users.noreply.github.com"
          git add backups
          git diff --cached --quiet || git commit -m "add backup $(date -u +%F)"
          git push
```

- [ ] **Step 3: Criar `README.md`**

```markdown
# backup-bolao-da-copa

Backups diários do [Bolão da Copa 2026](https://github.com/emersonjds/bolao-copa) —
um JSON por dia em `backups/YYYY-MM-DD.json`, commitado automaticamente às
**03:00 BRT** pelo workflow [`backup.yml`](.github/workflows/backup.yml).

> ⚠️ Este repo contém **dados pessoais** (nomes, e-mails, palpites).
> Tem que continuar **privado**.

## O que tem em cada arquivo

- `ranking` — classificação do dia (prova de quem estava com quantos pontos)
- `tabelas` — dump fiel das 7 tabelas do Supabase (restauração)
- `auth_users` — id + e-mail de cada conta (religa palpites aos donos num projeto novo)
- `contagens` / `schema_version` — sanidade e compatibilidade

## Secrets necessários (Settings → Secrets and variables → Actions)

| Secret | Valor |
| --- | --- |
| `SUPABASE_URL` | URL do projeto (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Settings → API → `service_role` |

## Rodar fora de hora

Actions → `backup-diario` → **Run workflow** (ex.: logo depois de um jogo decisivo).

## Restaurar

A restauração vive no repo do app (`scripts/restore.ts`):

```bash
# no clone do bolao-copa, com as migrations já aplicadas no destino:
DATABASE_URL=<pooler do dashboard> pnpm restore caminho/para/2026-06-15.json --prod
```

Detalhes e cenários (mesmo projeto × projeto novo): spec
[`2026-06-10-backup-diario-json-design.md`](https://github.com/emersonjds/bolao-copa/blob/master/docs/superpowers/specs/2026-06-10-backup-diario-json-design.md).
```

- [ ] **Step 4: Commitar (SEM push — o push é do humano)**

```bash
cd /Users/emerson/Documents/workspace/projects/backup-bolao-da-copa
git add .github/workflows/backup.yml README.md
git commit -m "add daily backup workflow and docs"
```

Expected: commit criado. **NÃO dar `git push`** — avisar o usuário que o push e o cadastro dos 2 secrets são passos manuais dele.

---

### Task 9: Documentação no handbook + validação final

**Files:**
- Modify: `docs/PROJETO.md` (§4 e §10)

- [ ] **Step 1: Adicionar o backup ao §4 do handbook**

Em `docs/PROJETO.md`, no fim da seção `## 4. Backend / dados (Supabase)`, adicionar:

```markdown
- **Backup diário (free tier não tem PITR):** o repo privado `backup-bolao-da-copa`
  commita um JSON por dia (03:00 BRT, GitHub Actions) com as 7 tabelas + ranking +
  extrato do auth. Export: `pnpm backup` (`scripts/backup.ts`). Restauração:
  `pnpm restore <arquivo.json>` (local; em prod exige `--prod` + confirmação;
  projeto novo: `supabase db push` antes — religa usuários por e-mail). Round-trip
  testado em `tests/db/backup-restore.test.ts`. Spec:
  `docs/superpowers/specs/2026-06-10-backup-diario-json-design.md`.
```

- [ ] **Step 2: Atualizar a pendência de PITR no §10**

Na linha do §10 que diz `Habilitar **PITR** em prod (ação no painel).`, trocar por:

```markdown
  Habilitar **PITR** em prod (ação no painel) — mitigado pelo backup diário em JSON (repo privado `backup-bolao-da-copa`).
```

- [ ] **Step 3: Validação final completa**

Run: `pnpm validate` (type-check + lint + format:check + test:run)
Expected: tudo verde (507 testes antigos + 12 novos de `scripts/lib`).

Run: `pnpm test:db`
Expected: 32 testes PASS.

- [ ] **Step 4: Commit**

```bash
git add docs/PROJETO.md
git commit -m "document daily backup and restore in handbook"
```

---

## Passos manuais do usuário (depois da implementação)

1. **Push** dos commits do `bolao-copa` (como sempre) e do `backup-bolao-da-copa`.
2. No repo privado: **Settings → Secrets and variables → Actions** → criar `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (valores do dashboard do Supabase prod).
3. **Actions → backup-diario → Run workflow** pra validar a primeira execução real (deve aparecer `backups/<hoje>.json` num commit novo).
4. Conferir que chegou o e-mail de notificação caso o workflow falhe (configuração padrão do GitHub já cobre).
```
