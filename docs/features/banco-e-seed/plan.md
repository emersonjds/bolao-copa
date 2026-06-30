# Banco + Seed — Implementation Plan (Plano 1 de 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Popular o banco Supabase com as 48 seleções reais e os 104 jogos da Copa 2026, gerados a partir do dataset público `openfootball/worldcup.json`.

**Architecture:** Uma migration ajusta o schema para aceitar os dados (FKs nuláveis no mata-mata, rótulos de exibição, bolão padrão). Um script Node/TS (`scripts/`) com funções puras testadas (TDD) baixa o JSON, transforma (nome→código FIFA, hora→UTC, round→fase) e emite `supabase/seed.sql`. A migration vai pra nuvem por `supabase db push`; o seed é aplicado no banco linkado.

**Tech Stack:** Supabase CLI (migrations), Postgres, Node 24 + TypeScript, Vitest (testes das funções de transformação).

**Spec:** `docs/superpowers/specs/2026-06-05-mvp-bolao-funcional-design.md` (§2, §3).

---

## Estrutura de arquivos

- Create: `supabase/migrations/0002_schema_para_seed.sql` — ajustes de schema p/ carga.
- Create: `scripts/lib/fifa-codes.ts` — mapa nome→código FIFA (48 seleções).
- Create: `scripts/lib/transform.ts` — funções puras de transformação.
- Create: `scripts/lib/transform.test.ts` — testes Vitest das funções puras.
- Create: `scripts/generate-seed.ts` — orquestrador: baixa JSON → escreve `supabase/seed.sql`.
- Create: `supabase/seed.sql` — gerado pelo script (versionado).
- Modify: `package.json` — adicionar script `seed:generate`.

---

## Task 1: Migration de schema para o seed

**Files:**

- Create: `supabase/migrations/0002_schema_para_seed.sql`

- [ ] **Step 1: Escrever a migration**

Conteúdo completo de `supabase/migrations/0002_schema_para_seed.sql`:

```sql
-- =============================================================================
-- 0002 — ajustes de schema para a carga do calendário oficial (seed)
--   - mata-mata entra com seleções indefinidas (placeholders "2A", "W74"):
--     FKs viram nuláveis e ganham rótulo de exibição.
--   - bolão padrão único (organizador opcional) para auto-inscrição no login.
-- =============================================================================

-- Mata-mata ainda não tem seleção definida no momento do seed.
alter table public.partidas alter column mandante_id  drop not null;
alter table public.partidas alter column visitante_id drop not null;

-- Rótulo exibido enquanto a seleção real não existe (ex.: "2A", "Vencedor Grupo A").
alter table public.partidas add column mandante_label  text;
alter table public.partidas add column visitante_label text;

-- Quem avançou nos pênaltis (mata-mata) — só exibição, não afeta pontos.
alter table public.partidas
  add column vencedor_penaltis uuid references public.selecoes (id);

-- Bolão padrão: organizador opcional (o bolão "da casa" não tem dono humano).
alter table public.boloes alter column organizador_id drop not null;

-- O bolão único, com id fixo e conhecido (usado na auto-inscrição do Plano 2).
insert into public.boloes (id, nome, organizador_id)
values ('00000000-0000-0000-0000-000000000b01', 'Bolão da Galera', null)
on conflict (id) do nothing;
```

- [ ] **Step 2: Aplicar a migration na nuvem**

Run: `supabase db push`
Expected: lista `0002_schema_para_seed.sql` e termina com `Finished supabase db push.` (sem erro).

- [ ] **Step 3: Conferir que aplicou**

Run: `supabase migration list`
Expected: a tabela mostra `0002 | 0002` (Local e Remote iguais).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_schema_para_seed.sql
git commit -m "add schema migration for fixture seed"
```

---

## Task 2: Mapa de códigos FIFA

**Files:**

- Create: `scripts/lib/fifa-codes.ts`

- [ ] **Step 1: Criar o mapa nome→código**

Conteúdo completo de `scripts/lib/fifa-codes.ts` (nomes exatamente como vêm do openfootball 2026):

```ts
/** Nome da seleção (como vem do openfootball) → código FIFA de 3 letras. */
export const FIFA_CODES: Record<string, string> = {
  Mexico: "MEX",
  "South Africa": "RSA",
  "South Korea": "KOR",
  "Czech Republic": "CZE",
  Canada: "CAN",
  USA: "USA",
  Brazil: "BRA",
  Argentina: "ARG",
  France: "FRA",
  England: "ENG",
  Spain: "ESP",
  Germany: "GER",
  Portugal: "POR",
  Netherlands: "NED",
  Belgium: "BEL",
  Croatia: "CRO",
  Uruguay: "URU",
  Colombia: "COL",
  Ecuador: "ECU",
  Paraguay: "PAR",
  Morocco: "MAR",
  Senegal: "SEN",
  Egypt: "EGY",
  Algeria: "ALG",
  Tunisia: "TUN",
  Ghana: "GHA",
  "Ivory Coast": "CIV",
  "Cape Verde": "CPV",
  "DR Congo": "COD",
  Japan: "JPN",
  Iran: "IRN",
  Iraq: "IRQ",
  "Saudi Arabia": "KSA",
  Qatar: "QAT",
  Jordan: "JOR",
  Uzbekistan: "UZB",
  Australia: "AUS",
  "New Zealand": "NZL",
  Switzerland: "SUI",
  Austria: "AUT",
  Norway: "NOR",
  Sweden: "SWE",
  Scotland: "SCO",
  Turkey: "TUR",
  Panama: "PAN",
  Haiti: "HAI",
  Curaçao: "CUW",
  "Bosnia & Herzegovina": "BIH",
};
```

> **Nota de execução:** este mapa cobre as seleções do dataset capturado em 2026-06-05.
> Se o gerador (Task 5) lançar `Seleção sem código FIFA: "<nome>"`, adicione a entrada aqui
> com o código FIFA correto e rode de novo. Isso é proposital — falha barulhenta em vez de
> dado silenciosamente errado.

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/fifa-codes.ts
git commit -m "add fifa country code map for seed"
```

---

## Task 3: Funções puras de transformação (TDD)

**Files:**

- Create: `scripts/lib/transform.ts`
- Test: `scripts/lib/transform.test.ts`

- [ ] **Step 1: Escrever os testes (falhando)**

Conteúdo completo de `scripts/lib/transform.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  parseKickoffToUtc,
  roundToFase,
  parseGroup,
  isPlaceholderTeam,
  fifaCode,
} from "./transform";

describe("parseKickoffToUtc", () => {
  it("converte horário com offset UTC-6 para UTC", () => {
    expect(parseKickoffToUtc("2026-06-11", "13:00 UTC-6")).toBe("2026-06-11T19:00:00.000Z");
  });
  it("converte horário com offset UTC-4 para UTC", () => {
    expect(parseKickoffToUtc("2026-06-18", "12:00 UTC-4")).toBe("2026-06-18T16:00:00.000Z");
  });
});

describe("roundToFase", () => {
  it("mapeia matchdays para grupos", () => {
    expect(roundToFase("Matchday 1")).toBe("grupos");
    expect(roundToFase("Matchday 17")).toBe("grupos");
  });
  it("mapeia as fases de mata-mata", () => {
    expect(roundToFase("Round of 32")).toBe("trinta-e-dois");
    expect(roundToFase("Round of 16")).toBe("oitavas");
    expect(roundToFase("Quarter-final")).toBe("quartas");
    expect(roundToFase("Semi-final")).toBe("semifinal");
    expect(roundToFase("Match for third place")).toBe("terceiro-lugar");
    expect(roundToFase("Final")).toBe("final");
  });
});

describe("parseGroup", () => {
  it("extrai a letra do grupo", () => {
    expect(parseGroup("Group A")).toBe("A");
    expect(parseGroup("Group L")).toBe("L");
  });
  it("devolve null quando não há grupo (mata-mata)", () => {
    expect(parseGroup(undefined)).toBeNull();
  });
});

describe("isPlaceholderTeam", () => {
  it("reconhece placeholders de posição e de vencedor", () => {
    expect(isPlaceholderTeam("2A")).toBe(true);
    expect(isPlaceholderTeam("1E")).toBe(true);
    expect(isPlaceholderTeam("3A/B/C/D/F")).toBe(true);
    expect(isPlaceholderTeam("W74")).toBe(true);
    expect(isPlaceholderTeam("L101")).toBe(true);
  });
  it("não marca seleções reais como placeholder", () => {
    expect(isPlaceholderTeam("Brazil")).toBe(false);
    expect(isPlaceholderTeam("South Korea")).toBe(false);
  });
});

describe("fifaCode", () => {
  it("devolve o código FIFA de uma seleção conhecida", () => {
    expect(fifaCode("Brazil")).toBe("BRA");
    expect(fifaCode("Ivory Coast")).toBe("CIV");
  });
  it("lança erro barulhento para seleção desconhecida", () => {
    expect(() => fifaCode("Atlantis")).toThrow(/Atlantis/);
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `pnpm vitest run scripts/lib/transform.test.ts`
Expected: FAIL — `Failed to resolve import "./transform"` (módulo ainda não existe).

- [ ] **Step 3: Implementar as funções**

Conteúdo completo de `scripts/lib/transform.ts`:

```ts
import { FIFA_CODES } from "./fifa-codes";

export type Fase =
  | "grupos"
  | "trinta-e-dois"
  | "oitavas"
  | "quartas"
  | "semifinal"
  | "terceiro-lugar"
  | "final";

const ROUND_TO_FASE: Record<string, Fase> = {
  "Round of 32": "trinta-e-dois",
  "Round of 16": "oitavas",
  "Quarter-final": "quartas",
  "Semi-final": "semifinal",
  "Match for third place": "terceiro-lugar",
  Final: "final",
};

/** Converte data + "HH:MM UTC-N" do openfootball para ISO 8601 em UTC. */
export function parseKickoffToUtc(date: string, time: string): string {
  const match = time.match(/^(\d{2}):(\d{2})\s+UTC([+-]\d{1,2})$/);
  if (!match) {
    throw new Error(`Horário em formato inesperado: "${time}"`);
  }
  const [, hh, mm, offset] = match;
  const sign = offset.startsWith("-") ? "-" : "+";
  const abs = Math.abs(Number(offset)).toString().padStart(2, "0");
  // Monta um instante com offset explícito e normaliza para UTC.
  const iso = `${date}T${hh}:${mm}:00${sign}${abs}:00`;
  return new Date(iso).toISOString();
}

/** "Matchday N" → grupos; demais rounds via tabela. */
export function roundToFase(round: string): Fase {
  if (round.startsWith("Matchday")) return "grupos";
  const fase = ROUND_TO_FASE[round];
  if (!fase) throw new Error(`Round sem mapeamento de fase: "${round}"`);
  return fase;
}

/** "Group A" → "A"; ausência de grupo (mata-mata) → null. */
export function parseGroup(group: string | undefined): string | null {
  if (!group) return null;
  return group.replace(/^Group\s+/, "");
}

/** Placeholders: posição de grupo ("2A", "3A/B/C/D/F") ou referência de jogo ("W74", "L101"). */
export function isPlaceholderTeam(team: string): boolean {
  return /^\d/.test(team) || /^[WL]\d+$/.test(team);
}

/** Nome da seleção → código FIFA; erro barulhento se faltar no mapa. */
export function fifaCode(name: string): string {
  const code = FIFA_CODES[name];
  if (!code) throw new Error(`Seleção sem código FIFA: "${name}"`);
  return code;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `pnpm vitest run scripts/lib/transform.test.ts`
Expected: PASS — todos os testes verdes.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/transform.ts scripts/lib/transform.test.ts
git commit -m "add seed transform functions with tests"
```

---

## Task 4: Gerador do seed

**Files:**

- Create: `scripts/generate-seed.ts`
- Modify: `package.json` (adicionar script)

- [ ] **Step 1: Escrever o gerador**

Conteúdo completo de `scripts/generate-seed.ts`:

```ts
/**
 * Gera supabase/seed.sql a partir do dataset público openfootball/worldcup.json.
 * Uso: pnpm seed:generate
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseKickoffToUtc,
  roundToFase,
  parseGroup,
  isPlaceholderTeam,
  fifaCode,
} from "./lib/transform";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

interface SourceMatch {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
}

function sqlStr(value: string | null): string {
  if (value === null) return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

/** Lado do confronto: ou FK por código FIFA, ou rótulo de exibição. */
function side(team: string): { idExpr: string; label: string | null } {
  if (isPlaceholderTeam(team)) {
    return { idExpr: "null", label: team };
  }
  return {
    idExpr: `(select id from selecoes where codigo = ${sqlStr(fifaCode(team))})`,
    label: null,
  };
}

async function main(): Promise<void> {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Falha ao baixar fixture (HTTP ${res.status})`);
  const data = (await res.json()) as { matches: SourceMatch[] };

  // Seleções reais distintas (ignora placeholders).
  const teams = new Map<string, string>(); // código → nome
  for (const m of data.matches) {
    for (const team of [m.team1, m.team2]) {
      if (!isPlaceholderTeam(team)) teams.set(fifaCode(team), team);
    }
  }

  const lines: string[] = [];
  lines.push("-- GERADO por scripts/generate-seed.ts — NÃO editar à mão.");
  lines.push("-- Fonte: openfootball/worldcup.json (2026). Reexecute com `pnpm seed:generate`.");
  lines.push("");
  lines.push(
    "truncate table public.palpites, public.partidas, public.selecoes restart identity cascade;"
  );
  lines.push("");

  // selecoes
  const selecaoValues = [...teams.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([codigo, nome]) => `  (${sqlStr(nome)}, ${sqlStr(codigo)})`);
  lines.push("insert into public.selecoes (nome, codigo) values");
  lines.push(selecaoValues.join(",\n") + ";");
  lines.push("");

  // partidas
  lines.push(
    "insert into public.partidas (fase, grupo, data_hora, estadio, status, mandante_id, visitante_id, mandante_label, visitante_label) values"
  );
  const partidaValues = data.matches.map((m) => {
    const mandante = side(m.team1);
    const visitante = side(m.team2);
    return (
      `  (${sqlStr(roundToFase(m.round))}, ${sqlStr(parseGroup(m.group))}, ` +
      `${sqlStr(parseKickoffToUtc(m.date, m.time))}, ${sqlStr(m.ground)}, 'agendada', ` +
      `${mandante.idExpr}, ${visitante.idExpr}, ${sqlStr(mandante.label)}, ${sqlStr(visitante.label)})`
    );
  });
  lines.push(partidaValues.join(",\n") + ";");
  lines.push("");

  const outPath = resolve(process.cwd(), "supabase/seed.sql");
  writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`OK: ${teams.size} seleções, ${data.matches.length} partidas → supabase/seed.sql`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Adicionar o script no package.json**

Em `package.json`, dentro de `"scripts"`, adicionar a linha (logo após `"dev": "next dev",`):

```json
    "seed:generate": "tsx scripts/generate-seed.ts",
```

- [ ] **Step 3: Garantir o runner `tsx` disponível**

Run: `pnpm add -D tsx`
Expected: `tsx` adicionado em devDependencies.

- [ ] **Step 4: Gerar o seed**

Run: `pnpm seed:generate`
Expected: imprime `OK: 48 seleções, 104 partidas → supabase/seed.sql` e cria/atualiza `supabase/seed.sql`.

- [ ] **Step 5: Conferir o seed gerado**

Run: `grep -c "select id from selecoes" supabase/seed.sql`
Expected: número > 90 (todos os jogos de grupo têm 2 FKs reais; ~96 referências na fase de grupos).

Run: `grep -c "'trinta-e-dois'" supabase/seed.sql`
Expected: `16` (os 16 jogos do Round of 32).

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-seed.ts package.json pnpm-lock.yaml supabase/seed.sql
git commit -m "add seed generator and generated seed sql"
```

---

## Task 5: Aplicar o seed no banco linkado

**Files:** nenhum (operação de banco).

> **Pré-requisito:** o banco precisa estar acessível via psql ou DBeaver (já configurado).
> A connection string do Session pooler está no painel Supabase (Connect → Direct/Session pooler).

- [ ] **Step 1: Aplicar o seed.sql no banco remoto**

Opção A — psql (substitua a URL pela do Session pooler, porta 5432):

```bash
psql "postgresql://postgres.gbspiwzdqkbhkckdaajz:[SENHA]@aws-1-us-west-2.pooler.supabase.com:5432/postgres" -f supabase/seed.sql
```

Opção B — DBeaver: abrir _SQL Editor_ → `File → Open` `supabase/seed.sql` → executar tudo (`Alt+X`).

Expected: sem erros; mensagens de `INSERT 0 48` (seleções) e `INSERT 0 104` (partidas).

- [ ] **Step 2: Validar a carga**

No DBeaver (ou psql), rodar:

```sql
select (select count(*) from selecoes) as selecoes,
       (select count(*) from partidas) as partidas,
       (select count(*) from partidas where fase = 'grupos') as jogos_grupo,
       (select count(*) from partidas where mandante_id is null) as mata_mata_placeholder;
```

Expected: `selecoes=48`, `partidas=104`, `jogos_grupo=72`, `mata_mata_placeholder=32`
(16 Round of 32 + 8 oitavas + 4 quartas + 2 semi + 1 terceiro + 1 final = 32 jogos com times indefinidos).

- [ ] **Step 3: Conferência visual rápida**

```sql
select fase, grupo, data_hora, estadio,
       coalesce((select codigo from selecoes where id = mandante_id), mandante_label)  as mandante,
       coalesce((select codigo from selecoes where id = visitante_id), visitante_label) as visitante
from partidas order by data_hora limit 5;
```

Expected: primeiros jogos da Copa (11/jun/2026), com códigos reais (MEX, RSA…) na fase de grupos.

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura do spec §2/§3:** seed do openfootball ✔ (Tasks 4-5); FKs nuláveis + labels ✔ (Task 1);
  bolão padrão ✔ (Task 1); fase `trinta-e-dois` ✔ (texto livre, sem migration; usada no transform).
  Itens do §3 adiados para planos seguintes (declarado): `is_admin`, auto-inscrição, RLS de admin,
  trigger de apuração, `get_ranking()` — pertencem aos Planos 2 e 5.
- **Placeholders:** nenhum "TBD/TODO"; todo código mostrado por inteiro.
- **Consistência de tipos:** `Fase` definido no transform e reusado; nomes de funções idênticos entre
  teste e implementação (`parseKickoffToUtc`, `roundToFase`, `parseGroup`, `isPlaceholderTeam`, `fifaCode`).
- **Contagens:** 72 jogos de grupo (12 grupos × 6) + 32 de mata-mata = 104 ✔.

```

```
