# Palpite "dia a dia" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Liberar palpites dia a dia — o jogo só aceita palpite a partir da meia-noite (horário de Brasília) do seu dia até o apito; jogos do dia seguinte aparecem com campos preenchíveis (rascunho local), mas o botão só salva os de hoje.

**Architecture:** A regra vive no Postgres (fonte de verdade): a trava existente ganha uma "borda inferior". Uma função canônica `janela_palpite_inicio()` define "o dia" em `America/Sao_Paulo`; uma coluna computada expõe `janela_inicio` para o front, que deriva o estado de cada jogo comparando instantes (sem cálculo de fuso no cliente). A tela vira sozinha na meia-noite via timer de borda + refetch no foco.

**Tech Stack:** Supabase/Postgres (plpgsql, trigger, computed column), Next.js 16 App Router, React 19, TanStack Query, TypeScript, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-08-palpite-dia-a-dia-design.md`

**Refinamento sobre o spec:** o spec citava uma *view* para expor `janela_inicio`. Durante o planejamento ficou claro que os embeds do PostgREST (`mandante:selecoes!mandante_id`) só funcionam na **tabela base**, não em view. Usamos então uma **coluna computada** (função `janela_inicio(public.partidas)`) — mesmo resultado, sem quebrar os joins.

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `supabase/migrations/0019_palpite_janela_dia.sql` | **novo** — função `janela_palpite_inicio`, coluna computada `janela_inicio`, `enforce_palpite_lock` com a borda inferior |
| `tests/db/palpite-janela.test.ts` | **novo** — cobertura da regra no Postgres |
| `tests/db/apurar-pontos.test.ts` | ajuste do helper `novaPartida` (jogo dentro da janela) |
| `src/entities/partida/model/partida.ts` | + campo `janelaInicio: string` |
| `src/features/partidas/api/partidas-fetcher.ts` | seleciona e mapeia `janela_inicio` |
| `src/features/palpites/lib/estado-palpite.ts` | **novo** — `estadoPalpite`, `filtrarHojeEProximoDia`, `proximaBorda` |
| `src/features/palpites/lib/rascunho-local.ts` | **novo** — persistência de rascunho no `localStorage` |
| `src/features/palpites/api/use-refetch-na-borda.ts` | **novo** — hook do timer de virada do dia |
| `src/features/partidas/api/queries.ts` | + `refetchOnWindowFocus` |
| `src/features/palpites/lib/traduzir-erro-salvar.ts` | + ramo `palpite_nao_liberado` |
| `src/features/palpites/components/card-palpite.tsx` | 3 estados (liberado/futuro/encerrado) |
| `src/features/palpites/components/palpites-content.tsx` | inclui D+1, deriva estado, rascunho, salva só hoje |
| `src/features/palpites/components/botao-salvar.tsx` | label "Salvar palpites de hoje" |
| `tests/e2e/palpite-dia-a-dia.spec.ts` | **novo** — fluxo em tela |

**Pré-requisito de toda execução de teste de banco:** `supabase start` rodando + `.env.test` presente (mesmo setup do `apurar-pontos.test.ts`). Comando: `pnpm test:db`.

---

## Task 1: Migration 0019 — a regra no servidor

**Files:**
- Create: `supabase/migrations/0019_palpite_janela_dia.sql`
- Test: `tests/db/palpite-janela.test.ts`

- [ ] **Step 1: Escrever a migration**

Create `supabase/migrations/0019_palpite_janela_dia.sql`:

```sql
-- Mecânica "palpite dia a dia": além da trava no apito (borda superior, 0012),
-- o palpite só é aceito a partir da MEIA-NOITE (horário de Brasília) do dia do
-- jogo (borda inferior). Janela válida: [janela_inicio, data_hora).
--
-- "O dia" é sempre America/Sao_Paulo (público BR; a Copa tem vários fusos nos
-- EUA/MEX/CAN). Zona nomeada, nunca offset fixo, por robustez a DST.

-- 1) Função canônica: meia-noite BRT do dia da partida, como instante.
create or replace function public.janela_palpite_inicio(p_data_hora timestamptz)
returns timestamptz
language sql
immutable
as $$
  select date_trunc('day', p_data_hora at time zone 'America/Sao_Paulo')
           at time zone 'America/Sao_Paulo';
$$;

-- 2) Coluna computada (PostgREST): expõe janela_inicio nos selects de partidas
--    SEM quebrar os embeds (joins a selecoes só funcionam na tabela base).
create or replace function public.janela_inicio(public.partidas)
returns timestamptz
language sql
stable
as $$
  select public.janela_palpite_inicio($1.data_hora);
$$;

grant execute on function public.janela_palpite_inicio(timestamptz) to authenticated, anon;
grant execute on function public.janela_inicio(public.partidas) to authenticated, anon;

-- 3) Trava: adiciona a borda inferior à função existente (mantém a superior).
create or replace function public.enforce_palpite_lock()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  kickoff timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.participante_id is distinct from old.participante_id then
      raise exception 'participante_id é imutável após a criação do palpite';
    end if;
    if new.partida_id is distinct from old.partida_id then
      raise exception 'partida_id é imutável após a criação do palpite';
    end if;
  end if;

  -- Apuração: gols inalterados => só pontos/updated_at mudaram. Liberado sem
  -- checar a janela (participante_id e partida_id já validados acima).
  if tg_op = 'UPDATE'
     and new.gols_mandante is not distinct from old.gols_mandante
     and new.gols_visitante is not distinct from old.gols_visitante then
    return new;
  end if;

  select data_hora into kickoff from public.partidas where id = new.partida_id;
  if kickoff is null then
    raise exception 'Partida inexistente';
  end if;

  -- Borda inferior (nova): antes da meia-noite BRT do dia do jogo.
  if now() < public.janela_palpite_inicio(kickoff) then
    raise exception 'palpite_nao_liberado: os palpites deste jogo abrem no dia da partida';
  end if;

  -- Borda superior (existente): apito já dado.
  if now() >= kickoff then
    raise exception 'Palpite encerrado: a partida já começou';
  end if;

  return new;
end;
$$;
```

- [ ] **Step 2: Aplicar a migration no banco local**

Run: `supabase db reset` (recria o banco local aplicando 0001–0019; valida a sintaxe SQL)
Expected: termina sem erro; última linha menciona a 0019 aplicada.

- [ ] **Step 3: Escrever os testes de banco (que vão falhar antes do Step 2? não — já aplicamos; então rodam contra a regra nova)**

Create `tests/db/palpite-janela.test.ts` (segue o boilerplate de `apurar-pontos.test.ts` — copie o bloco de leitura de `.env.test`, conexão `pg`, criação do participante de teste, BEGIN/ROLLBACK por teste):

```ts
/**
 * Testes da janela de palpite (mecânica "dia a dia") no BANCO.
 * Bate no Postgres LOCAL (supabase start). Valida a borda inferior do
 * enforce_palpite_lock e a função janela_palpite_inicio.
 */
import { afterAll, beforeAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#")) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const DB = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BOLAO = "00000000-0000-0000-0000-000000000b01";

const db = new Client({ connectionString: DB });
const admin = createClient(SUPA_URL, SERVICE, { auth: { persistSession: false } });
let participanteId: string;
let userIdTeste: string;
let selA: string;
let selB: string;

beforeAll(async () => {
  await db.connect();
  const email = "dbtest-janela@bolao.test";
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let userId = list.users.find((u) => u.email === email)?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: "Db-Teste-2026!",
      email_confirm: true,
      user_metadata: { full_name: "DB Teste Janela" },
    });
    if (error || !data.user) throw new Error(`createUser falhou: ${error?.message}`);
    userId = data.user.id;
  }
  userIdTeste = userId;
  const pa = await db.query("select id from participantes where user_id=$1 and bolao_id=$2", [userId, BOLAO]);
  participanteId = pa.rows[0].id;
  const sel = await db.query("select id from selecoes order by codigo limit 2");
  selA = sel.rows[0].id;
  selB = sel.rows[1].id;
});

afterAll(async () => {
  if (userIdTeste) await admin.auth.admin.deleteUser(userIdTeste);
  await db.end();
});

beforeEach(async () => { await db.query("BEGIN"); });
afterEach(async () => { await db.query("ROLLBACK"); });

/** Insere uma partida com data_hora explícita e devolve o id. */
async function partidaEm(dataHoraSql: string): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
     values ('grupos', ${dataHoraSql}, 'Estádio Teste', 'agendada', $1, $2) returning id`,
    [selA, selB]
  );
  return r.rows[0].id;
}

async function palpita(partida: string): Promise<void> {
  await db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante) values ($1,$2,1,0)`,
    [participanteId, partida]
  );
}

describe("janela_palpite_inicio — meia-noite BRT do dia do jogo", () => {
  it("jogo às 22h BRT vira meia-noite do mesmo dia BRT", async () => {
    const r = await db.query<{ ini: string }>(
      "select to_char(public.janela_palpite_inicio('2026-06-15 22:00:00-03'::timestamptz) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as ini"
    );
    expect(r.rows[0].ini).toBe("2026-06-15 00:00");
  });

  it("jogo 21h em Los Angeles (UTC-7) = 01h BRT do dia seguinte → janela abre meia-noite BRT desse dia seguinte", async () => {
    // 2026-06-15 21:00 PDT = 2026-06-16 04:00 UTC = 2026-06-16 01:00 BRT
    const r = await db.query<{ ini: string }>(
      "select to_char(public.janela_palpite_inicio('2026-06-15 21:00:00-07'::timestamptz) at time zone 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI') as ini"
    );
    expect(r.rows[0].ini).toBe("2026-06-16 00:00");
  });
});

describe("enforce_palpite_lock — borda inferior (dia a dia)", () => {
  it("recusa palpite ANTES da janela (jogo daqui a 10 dias)", async () => {
    const p = await partidaEm("now() + interval '10 days'");
    await expect(palpita(p)).rejects.toThrow(/nao_liberado|não liberado|abrem no dia/i);
  });

  it("aceita palpite DENTRO da janela (jogo hoje, 23h BRT)", async () => {
    // 23h BRT de hoje: janela_inicio = meia-noite de hoje (passado) e apito no futuro.
    const p = await partidaEm(
      "(date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') + interval '23 hours'"
    );
    await expect(palpita(p)).resolves.toBeUndefined();
  });

  it("recusa palpite DEPOIS do apito (borda superior, sem regressão)", async () => {
    const p = await partidaEm("now() - interval '1 hour'");
    await expect(palpita(p)).rejects.toThrow(/encerrado|começou/i);
  });
});

describe("coluna computada janela_inicio", () => {
  it("PostgREST/SQL expõe janela_inicio coerente com a função", async () => {
    const p = await partidaEm("'2026-06-20 18:00:00-03'::timestamptz");
    const r = await db.query<{ a: string; b: string }>(
      `select to_char(public.janela_inicio(pa.*) at time zone 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') a,
              to_char(public.janela_palpite_inicio(pa.data_hora) at time zone 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') b
       from partidas pa where pa.id=$1`,
      [p]
    );
    expect(r.rows[0].a).toBe(r.rows[0].b);
    expect(r.rows[0].a).toBe("2026-06-20 00:00");
  });
});
```

- [ ] **Step 4: Rodar os testes de banco**

Run: `pnpm test:db tests/db/palpite-janela.test.ts`
Expected: PASS (todos). Se "aceita dentro da janela" falhar, confira se o relógio local não está nos últimos minutos antes da meia-noite BRT (edge documentado).

- [ ] **Step 5: Corrigir o helper do teste de pontuação (regressão)**

O `novaPartida` de `apurar-pontos.test.ts` cria partidas `now() + interval '10 days'` e insere palpites — agora a borda inferior recusa isso. Edite `tests/db/apurar-pontos.test.ts:78-85` para criar a partida **dentro da janela** (hoje, 23h BRT):

```ts
/** Cria uma partida HOJE (dentro da janela de palpite) na fase dada. */
async function novaPartida(fase = "grupos"): Promise<string> {
  const r = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id)
     values ($1,
       (date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') + interval '23 hours',
       'Estádio Teste', 'agendada', $2, $3) returning id`,
    [fase, selA, selB]
  );
  return r.rows[0].id;
}
```

- [ ] **Step 6: Rodar TODOS os testes de banco (sem regressão)**

Run: `pnpm test:db`
Expected: PASS — `apurar-pontos.test.ts` e `palpite-janela.test.ts` verdes.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0019_palpite_janela_dia.sql tests/db/palpite-janela.test.ts tests/db/apurar-pontos.test.ts
git commit -m "add lower-bound betting window to palpite lock"
```

---

## Task 2: Entity + fetcher — expor `janelaInicio` no front

**Files:**
- Modify: `src/entities/partida/model/partida.ts`
- Modify: `src/features/partidas/api/partidas-fetcher.ts`
- Test: `src/features/partidas/api/partidas-fetcher.test.ts`

- [ ] **Step 1: Adicionar o campo ao tipo**

In `src/entities/partida/model/partida.ts`, dentro de `interface Partida`, após `dataHora`:

```ts
  /** ISO 8601 (UTC) da abertura da janela de palpite (meia-noite BRT do dia do jogo). */
  janelaInicio: string;
```

- [ ] **Step 2: Escrever/ajustar o teste do fetcher**

In `src/features/partidas/api/partidas-fetcher.test.ts`, garanta que o mock do Supabase retorna `janela_inicio` e que o map expõe `janelaInicio`. Adicione ao objeto de linha mockado `janela_inicio: "2026-06-15T03:00:00Z"` e um assert:

```ts
expect(resultado[0].janelaInicio).toBe("2026-06-15T03:00:00Z");
```

- [ ] **Step 3: Rodar — falha (campo não mapeado)**

Run: `pnpm test:run src/features/partidas/api/partidas-fetcher.test.ts`
Expected: FAIL (`janelaInicio` undefined).

- [ ] **Step 4: Mapear no fetcher**

In `src/features/partidas/api/partidas-fetcher.ts`:
- Em `interface PartidaDb`, adicione após `data_hora`: `janela_inicio: string;`
- No `.select(...)`, adicione a linha `janela_inicio,` logo após `data_hora,`.
- Em `mapPartida`, adicione após `dataHora: db.data_hora,`: `janelaInicio: db.janela_inicio,`.

- [ ] **Step 5: Rodar — passa**

Run: `pnpm test:run src/features/partidas/api/partidas-fetcher.test.ts`
Expected: PASS.

- [ ] **Step 6: Atualizar fixtures que constroem `Partida`**

Run: `pnpm type-check`
Expected: erros em fixtures de teste sem `janelaInicio`. Para cada fixture/factory de `Partida` (ex.: em `src/features/palpites/**/__tests__` ou helpers de mock), adicione `janelaInicio` coerente (regra: meia-noite UTC-3 do dia de `dataHora`; em testes basta uma string ISO no passado para "liberado", ex.: `"2020-01-01T03:00:00Z"`). Repita `pnpm type-check` até zerar.

- [ ] **Step 7: Commit**

```bash
git add src/entities/partida/model/partida.ts src/features/partidas/api/
git commit -m "expose janela_inicio on partida payload"
```

---

## Task 3: `estado-palpite.ts` — derivação dos 3 estados

**Files:**
- Create: `src/features/palpites/lib/estado-palpite.ts`
- Test: `src/features/palpites/lib/estado-palpite.test.ts`

- [ ] **Step 1: Escrever os testes (falham)**

Create `src/features/palpites/lib/estado-palpite.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Partida } from "@/entities/partida";
import { estadoPalpite, filtrarHojeEProximoDia, proximaBorda } from "./estado-palpite";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

function partida(over: Partial<Partida>): Partida {
  return {
    id: "p1", fase: "grupos", grupo: "A", dataHora: "", estadio: "x", status: "agendada",
    mandante: { id: "a", nome: "A", codigo: "AAA" },
    visitante: { id: "b", nome: "B", codigo: "BBB" },
    golsMandante: null, golsVisitante: null, vencedorPenaltis: null,
    mandanteLabel: null, visitanteLabel: null, janelaInicio: "",
    ...over,
  };
}

describe("estadoPalpite", () => {
  const agora = 1_000_000_000_000;
  it("liberado: janela aberta e antes do apito", () => {
    const p = partida({ janelaInicio: new Date(agora - HORA).toISOString(), dataHora: new Date(agora + HORA).toISOString() });
    expect(estadoPalpite(p, agora)).toBe("liberado");
  });
  it("futuro: janela ainda não abriu", () => {
    const p = partida({ janelaInicio: new Date(agora + HORA).toISOString(), dataHora: new Date(agora + 5 * HORA).toISOString() });
    expect(estadoPalpite(p, agora)).toBe("futuro");
  });
  it("encerrado: apito já passou", () => {
    const p = partida({ janelaInicio: new Date(agora - 5 * HORA).toISOString(), dataHora: new Date(agora - HORA).toISOString() });
    expect(estadoPalpite(p, agora)).toBe("encerrado");
  });
  it("encerrado: status não agendada mesmo antes do apito", () => {
    const p = partida({ status: "encerrada", janelaInicio: new Date(agora - HORA).toISOString(), dataHora: new Date(agora + HORA).toISOString() });
    expect(estadoPalpite(p, agora)).toBe("encerrado");
  });
});

describe("filtrarHojeEProximoDia", () => {
  const agora = 1_000_000_000_000;
  it("retorna liberados + só o grupo futuro de menor janela_inicio", () => {
    const hoje = partida({ id: "hoje", janelaInicio: new Date(agora - HORA).toISOString(), dataHora: new Date(agora + HORA).toISOString() });
    const amanha = partida({ id: "amanha", janelaInicio: new Date(agora + DIA).toISOString(), dataHora: new Date(agora + DIA + HORA).toISOString() });
    const depois = partida({ id: "depois", janelaInicio: new Date(agora + 2 * DIA).toISOString(), dataHora: new Date(agora + 2 * DIA + HORA).toISOString() });
    const r = filtrarHojeEProximoDia([hoje, amanha, depois], agora);
    expect(r.map((p) => p.id).sort()).toEqual(["amanha", "hoje"]);
  });
  it("sem futuros, retorna só os liberados", () => {
    const hoje = partida({ id: "hoje", janelaInicio: new Date(agora - HORA).toISOString(), dataHora: new Date(agora + HORA).toISOString() });
    expect(filtrarHojeEProximoDia([hoje], agora).map((p) => p.id)).toEqual(["hoje"]);
  });
});

describe("proximaBorda", () => {
  const agora = 1_000_000_000_000;
  it("retorna o menor instante futuro (abertura de futuro ou apito de liberado)", () => {
    const liberado = partida({ janelaInicio: new Date(agora - HORA).toISOString(), dataHora: new Date(agora + 3 * HORA).toISOString() });
    const futuro = partida({ janelaInicio: new Date(agora + HORA).toISOString(), dataHora: new Date(agora + 6 * HORA).toISOString() });
    expect(proximaBorda([liberado, futuro], agora)).toBe(agora + HORA);
  });
  it("null quando não há borda futura", () => {
    const encerrado = partida({ janelaInicio: new Date(agora - 5 * HORA).toISOString(), dataHora: new Date(agora - HORA).toISOString() });
    expect(proximaBorda([encerrado], agora)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/palpites/lib/estado-palpite.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

Create `src/features/palpites/lib/estado-palpite.ts`:

```ts
import type { Partida } from "@/entities/partida";

export type EstadoPalpite = "liberado" | "futuro" | "encerrado";

/**
 * Estado de um jogo na tela de palpites, derivado dos instantes (epoch). A regra
 * de fuso já foi resolvida no servidor (Partida.janelaInicio); aqui só comparamos
 * instantes — nada de cálculo de meia-noite no cliente.
 */
export function estadoPalpite(partida: Partida, agora: number): EstadoPalpite {
  if (partida.status !== "agendada" || new Date(partida.dataHora).getTime() <= agora) {
    return "encerrado";
  }
  if (agora < new Date(partida.janelaInicio).getTime()) {
    return "futuro";
  }
  return "liberado";
}

/** Jogos liberados hoje + o grupo futuro de MENOR janela_inicio (só o próximo dia). */
export function filtrarHojeEProximoDia(partidas: Partida[], agora: number): Partida[] {
  const liberadas = partidas.filter((p) => estadoPalpite(p, agora) === "liberado");
  const futuras = partidas.filter((p) => estadoPalpite(p, agora) === "futuro");
  if (futuras.length === 0) return liberadas;
  const proxima = Math.min(...futuras.map((p) => new Date(p.janelaInicio).getTime()));
  const proximoDia = futuras.filter((p) => new Date(p.janelaInicio).getTime() === proxima);
  return [...liberadas, ...proximoDia];
}

/** Próximo instante (ms) em que a UI muda: abre um futuro ou fecha um liberado. */
export function proximaBorda(partidas: Partida[], agora: number): number | null {
  const instantes: number[] = [];
  for (const p of partidas) {
    const estado = estadoPalpite(p, agora);
    if (estado === "futuro") instantes.push(new Date(p.janelaInicio).getTime());
    else if (estado === "liberado") instantes.push(new Date(p.dataHora).getTime());
  }
  const futuros = instantes.filter((t) => t > agora);
  return futuros.length > 0 ? Math.min(...futuros) : null;
}
```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/palpites/lib/estado-palpite.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/palpites/lib/estado-palpite.ts src/features/palpites/lib/estado-palpite.test.ts
git commit -m "add estadoPalpite derivation and day filter"
```

---

## Task 4: `rascunho-local.ts` — rascunho no localStorage

**Files:**
- Create: `src/features/palpites/lib/rascunho-local.ts`
- Test: `src/features/palpites/lib/rascunho-local.test.ts`

- [ ] **Step 1: Escrever os testes (falham)**

Create `src/features/palpites/lib/rascunho-local.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { salvarRascunho, lerRascunho, limparRascunho } from "./rascunho-local";

beforeEach(() => localStorage.clear());

describe("rascunho-local", () => {
  it("salva e lê um rascunho por usuário+partida", () => {
    salvarRascunho("u1", "p1", { mandante: "2", visitante: "1" });
    expect(lerRascunho("u1", "p1")).toEqual({ mandante: "2", visitante: "1" });
  });
  it("isola por usuário", () => {
    salvarRascunho("u1", "p1", { mandante: "2", visitante: "1" });
    expect(lerRascunho("u2", "p1")).toBeUndefined();
  });
  it("limpa o rascunho", () => {
    salvarRascunho("u1", "p1", { mandante: "2", visitante: "1" });
    limparRascunho("u1", "p1");
    expect(lerRascunho("u1", "p1")).toBeUndefined();
  });
  it("retorna undefined para dado corrompido", () => {
    localStorage.setItem("palpite-rascunho:u1:p1", "{nao-json");
    expect(lerRascunho("u1", "p1")).toBeUndefined();
  });
  it("retorna undefined quando não há rascunho", () => {
    expect(lerRascunho("u1", "pX")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/palpites/lib/rascunho-local.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

Create `src/features/palpites/lib/rascunho-local.ts`:

```ts
import type { PlacarLocal } from "../components/card-palpite";

const PREFIX = "palpite-rascunho";

function chave(userId: string, partidaId: string): string {
  return `${PREFIX}:${userId}:${partidaId}`;
}

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // localStorage pode lançar (modo privado/bloqueado)
  }
}

export function salvarRascunho(userId: string, partidaId: string, placar: PlacarLocal): void {
  const s = storage();
  if (!s) return;
  try {
    s.setItem(chave(userId, partidaId), JSON.stringify(placar));
  } catch {
    /* cota cheia / bloqueado: rascunho é best-effort */
  }
}

export function lerRascunho(userId: string, partidaId: string): PlacarLocal | undefined {
  const s = storage();
  if (!s) return undefined;
  const cru = s.getItem(chave(userId, partidaId));
  if (!cru) return undefined;
  try {
    const obj = JSON.parse(cru) as unknown;
    if (
      typeof obj === "object" &&
      obj !== null &&
      typeof (obj as PlacarLocal).mandante === "string" &&
      typeof (obj as PlacarLocal).visitante === "string"
    ) {
      return obj as PlacarLocal;
    }
    return undefined;
  } catch {
    return undefined; // JSON corrompido
  }
}

export function limparRascunho(userId: string, partidaId: string): void {
  const s = storage();
  if (!s) return;
  try {
    s.removeItem(chave(userId, partidaId));
  } catch {
    /* ignore */
  }
}
```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/palpites/lib/rascunho-local.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/palpites/lib/rascunho-local.ts src/features/palpites/lib/rascunho-local.test.ts
git commit -m "add local draft persistence for palpites"
```

---

## Task 5: Timer de borda + refetch no foco

**Files:**
- Create: `src/features/palpites/api/use-refetch-na-borda.ts`
- Test: `src/features/palpites/api/use-refetch-na-borda.test.tsx`
- Modify: `src/features/partidas/api/queries.ts`

- [ ] **Step 1: `refetchOnWindowFocus` nas partidas**

In `src/features/partidas/api/queries.ts`, dentro de `useQuery({...})`, após `staleTime: 10 * 60 * 1000,`:

```ts
    refetchOnWindowFocus: true,
```

- [ ] **Step 2: Escrever o teste do hook (falha)**

Create `src/features/palpites/api/use-refetch-na-borda.test.tsx`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { useRefetchNaBorda } from "./use-refetch-na-borda";

const HORA = 60 * 60 * 1000;
function partida(over: Partial<Partida>): Partida {
  return {
    id: "p", fase: "grupos", grupo: "A", dataHora: "", estadio: "x", status: "agendada",
    mandante: { id: "a", nome: "A", codigo: "AAA" }, visitante: { id: "b", nome: "B", codigo: "BBB" },
    golsMandante: null, golsVisitante: null, vencedorPenaltis: null,
    mandanteLabel: null, visitanteLabel: null, janelaInicio: "", ...over,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useRefetchNaBorda", () => {
  it("dispara onBorda ao cruzar a próxima borda", () => {
    const agora = Date.now();
    const futuro = partida({ janelaInicio: new Date(agora + HORA).toISOString(), dataHora: new Date(agora + 5 * HORA).toISOString() });
    const onBorda = vi.fn();
    renderHook(() => useRefetchNaBorda([futuro], onBorda));
    expect(onBorda).not.toHaveBeenCalled();
    vi.advanceTimersByTime(HORA + 10);
    expect(onBorda).toHaveBeenCalledTimes(1);
  });

  it("não agenda nada quando não há borda futura", () => {
    const onBorda = vi.fn();
    renderHook(() => useRefetchNaBorda([], onBorda));
    vi.advanceTimersByTime(10 * HORA);
    expect(onBorda).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Rodar — falha**

Run: `pnpm test:run src/features/palpites/api/use-refetch-na-borda.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 4: Implementar o hook**

Create `src/features/palpites/api/use-refetch-na-borda.ts`:

```ts
"use client";

import { useEffect } from "react";
import type { Partida } from "@/entities/partida";
import { proximaBorda } from "../lib/estado-palpite";

/**
 * Agenda um timer até a próxima "virada" (abertura de um jogo futuro ou apito de
 * um liberado) e chama onBorda quando ela chega. Faz a tela reagir à meia-noite
 * sem polling. Reagenda quando `partidas` muda.
 */
export function useRefetchNaBorda(partidas: Partida[], onBorda: () => void): void {
  useEffect(() => {
    const agora = Date.now();
    const borda = proximaBorda(partidas, agora);
    if (borda === null) return;
    const delay = Math.max(0, borda - agora);
    const id = setTimeout(onBorda, delay);
    return () => clearTimeout(id);
  }, [partidas, onBorda]);
}
```

- [ ] **Step 5: Rodar — passa**

Run: `pnpm test:run src/features/palpites/api/use-refetch-na-borda.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/partidas/api/queries.ts src/features/palpites/api/use-refetch-na-borda.ts src/features/palpites/api/use-refetch-na-borda.test.tsx
git commit -m "add boundary timer and window-focus refetch"
```

---

## Task 6: `traduzir-erro-salvar` — ramo "não liberado"

**Files:**
- Modify: `src/features/palpites/lib/traduzir-erro-salvar.ts`
- Test: `src/features/palpites/lib/traduzir-erro-salvar.test.ts`

- [ ] **Step 1: Escrever o teste (falha)**

In `src/features/palpites/lib/traduzir-erro-salvar.test.ts`, adicione:

```ts
it("traduz palpite_nao_liberado para aviso de dia da partida", () => {
  const r = traduzirErroSalvar("palpite_nao_liberado: os palpites deste jogo abrem no dia da partida");
  expect(r.tipo).toBe("lock");
  expect(r.texto).toMatch(/abrem no dia|ainda não é o dia/i);
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/palpites/lib/traduzir-erro-salvar.test.ts`
Expected: FAIL (cai no genérico).

- [ ] **Step 3: Implementar o ramo**

In `src/features/palpites/lib/traduzir-erro-salvar.ts`, antes do bloco `if (msg.includes("começou")...`:

```ts
  // Borda inferior: o jogo ainda não liberou (antes da meia-noite BRT do dia).
  if (msg.includes("nao_liberado") || msg.includes("não liberado") || msg.includes("abrem no dia")) {
    return {
      tipo: "lock",
      texto: "Ainda não é o dia! Os palpites deste jogo abrem na data da partida.",
    };
  }

```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/palpites/lib/traduzir-erro-salvar.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/palpites/lib/traduzir-erro-salvar.ts src/features/palpites/lib/traduzir-erro-salvar.test.ts
git commit -m "translate palpite_nao_liberado error to friendly pt-br"
```

---

## Task 7: `CardPalpite` — estado "futuro" (âmbar, preenchível)

**Files:**
- Modify: `src/features/palpites/components/card-palpite.tsx`
- Test: `src/features/palpites/components/card-palpite.test.tsx`

- [ ] **Step 1: Escrever os testes (falham)**

In `src/features/palpites/components/card-palpite.test.tsx`, adicione casos (passando a nova prop `estado`):

```ts
it("estado futuro: mostra 'Libera amanhã' e mantém inputs habilitados", () => {
  render(
    <CardPalpite
      partida={partidaFutura}
      estado="futuro"
      palpiteSalvo={undefined}
      placarLocal={undefined}
      onChangeMandante={() => {}}
      onChangeVisitante={() => {}}
      disabled={false}
    />
  );
  expect(screen.getByText(/libera amanhã/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/Gols do/i)).not.toBeDisabled();
});

it("estado futuro com rascunho: mostra microcopy de rascunho", () => {
  render(
    <CardPalpite
      partida={partidaFutura}
      estado="futuro"
      palpiteSalvo={undefined}
      placarLocal={{ mandante: "2", visitante: "1" }}
      onChangeMandante={() => {}}
      onChangeVisitante={() => {}}
      disabled={false}
    />
  );
  expect(screen.getByText(/rascunho guardado/i)).toBeInTheDocument();
});
```

(Adicione `partidaFutura` como cópia do fixture aberto com `janelaInicio` no futuro. Os testes existentes que renderizam `CardPalpite` precisam da prop `estado` — passe `estado="liberado"` nos casos "abertos" e `estado="encerrado"` nos casos travados.)

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/palpites/components/card-palpite.test.tsx`
Expected: FAIL (prop `estado` inexistente / texto ausente).

- [ ] **Step 3: Implementar**

In `src/features/palpites/components/card-palpite.tsx`:

1. Importe o tipo: adicione `import type { EstadoPalpite } from "../lib/estado-palpite";` e o ícone `Clock` em `import { Check, Clock, Lock } from "lucide-react";`.
2. Adicione `estado: EstadoPalpite;` à `interface CardPalpiteProps` e ao destructuring.
3. Substitua a derivação interna `const travado = isTravado(partida);` por uso da prop: trate `estado === "encerrado"` no lugar de `travado`, e adicione o ramo `estado === "futuro"`. Remova a função `isTravado` (não mais usada).
4. Antes do `return` do card aberto (liberado), adicione o ramo futuro:

```tsx
  if (estado === "futuro") {
    const temRascunho =
      !!placarLocal && placarLocal.mandante !== "" && placarLocal.visitante !== "";
    return (
      <article className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            {badgeGrupo}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Libera amanhã
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <FlagIcon codigoFifa={partida.mandante.codigo} nome={partida.mandante.nome} tamanho="md" />
            <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
              {partida.mandante.nome}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="number" min={0} max={20} inputMode="numeric"
              value={valorMandante}
              onChange={(e) => onChangeMandante(e.target.value)}
              disabled={disabled}
              aria-label={`Gols do ${partida.mandante.nome}`}
              className={INPUT_BASE}
            />
            <span className="font-mono text-lg font-bold text-muted-foreground" aria-hidden="true">×</span>
            <input
              type="number" min={0} max={20} inputMode="numeric"
              value={valorVisitante}
              onChange={(e) => onChangeVisitante(e.target.value)}
              disabled={disabled}
              aria-label={`Gols do ${partida.visitante.nome}`}
              className={INPUT_BASE}
            />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <FlagIcon codigoFifa={partida.visitante.codigo} nome={partida.visitante.nome} tamanho="md" />
            <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
              {partida.visitante.nome}
            </span>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-amber-700">
          {temRascunho ? "Rascunho guardado · salva quando liberar" : "Você pode preparar seu palpite aqui"}
        </p>
      </article>
    );
  }
```

5. No ramo travado existente, troque a condição `if (travado)` por `if (estado === "encerrado")`.

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/palpites/components/card-palpite.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/palpites/components/card-palpite.tsx src/features/palpites/components/card-palpite.test.tsx
git commit -m "add future state to palpite card"
```

---

## Task 8: `ListaPalpites` — passar o estado por card

**Files:**
- Modify: `src/features/palpites/components/lista-palpites.tsx`
- Test: `src/features/palpites/components/lista-palpites.test.tsx`

- [ ] **Step 1: Ajustar a assinatura e o repasse**

In `src/features/palpites/components/lista-palpites.tsx`:
- Importe: `import { estadoPalpite } from "../lib/estado-palpite";`
- Adicione `agora: number;` à `interface ListaPalpitesProps` e ao destructuring.
- No `<CardPalpite ... />`, adicione a prop `estado={estadoPalpite(partida, agora)}`.

- [ ] **Step 2: Ajustar o teste**

In `src/features/palpites/components/lista-palpites.test.tsx`, passe `agora={Date.now()}` ao renderizar `ListaPalpites`. Adicione um assert simples de que um jogo futuro renderiza "Libera amanhã".

- [ ] **Step 3: Rodar — passa**

Run: `pnpm test:run src/features/palpites/components/lista-palpites.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/palpites/components/lista-palpites.tsx src/features/palpites/components/lista-palpites.test.tsx
git commit -m "thread palpite state through lista-palpites"
```

---

## Task 9: `BotaoSalvar` — escopo "só hoje"

**Files:**
- Modify: `src/features/palpites/components/botao-salvar.tsx`
- Test: `src/features/palpites/components/botao-salvar.test.tsx`

- [ ] **Step 1: Ajustar o teste**

In `src/features/palpites/components/botao-salvar.test.tsx`, troque a asserção do texto do botão de `"Salvar palpites"` para `"Salvar palpites de hoje"`.

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/palpites/components/botao-salvar.test.tsx`
Expected: FAIL (texto antigo).

- [ ] **Step 3: Implementar**

In `src/features/palpites/components/botao-salvar.tsx`, troque o literal `"Salvar palpites"` por `"Salvar palpites de hoje"`.

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/palpites/components/botao-salvar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/palpites/components/botao-salvar.tsx src/features/palpites/components/botao-salvar.test.tsx
git commit -m "scope save button to today's palpites"
```

---

## Task 10: `PalpitesContent` — orquestração (D+1, estado, rascunho, salvar só hoje)

**Files:**
- Modify: `src/features/palpites/components/palpites-content.tsx`
- Test: `src/features/palpites/components/palpites-content.test.tsx`

- [ ] **Step 1: Escrever os testes de comportamento (falham)**

In `src/features/palpites/components/palpites-content.test.tsx`, adicione (com `vi.useFakeTimers()` e mocks de `usePartidas`/`useMeusPalpites`/`useSalvarPalpite` no padrão já usado no arquivo):

```ts
it("mostra jogos de hoje e de amanhã, mas não de depois de amanhã", async () => {
  // partidas: hoje (liberado), amanhã (futuro D+1), depois (futuro D+2)
  // assert: nomes de hoje e amanhã presentes; nome de depois ausente
});

it("não inclui jogos futuros ao salvar (só os de hoje)", async () => {
  // digita placar num jogo de hoje e num de amanhã; clica salvar
  // assert: salvarPalpite chamado só com a partida de hoje
});
```

(Preencha os fixtures com `janelaInicio` coerente: hoje no passado, amanhã = `Date.now() + 24h`, depois = `+48h`.)

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/palpites/components/palpites-content.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar a orquestração**

In `src/features/palpites/components/palpites-content.tsx`:

1. Imports novos:
```ts
import { useEffect, useState } from "react";
import { useSupabaseUser } from "@/shared/lib/supabase";
import { estadoPalpite, filtrarHojeEProximoDia } from "../lib/estado-palpite";
import { lerRascunho, salvarRascunho, limparRascunho } from "../lib/rascunho-local";
import { useRefetchNaBorda } from "../api/use-refetch-na-borda";
```
2. Remova a função local `estaEmJogo` e troque seus usos por `estadoPalpite(p, agora) === "encerrado"`. Onde antes era `!estaEmJogo(p)` (liberado p/ edição), passa a ser `estadoPalpite(p, agora) !== "encerrado"`; onde a regra de salvar exige "hoje", use `estadoPalpite(p, agora) === "liberado"`.
3. Estado de tempo e usuário:
```ts
const userId = useSupabaseUser()?.id ?? null;
const [agora, setAgora] = useState<number>(() => Date.now());
useRefetchNaBorda(partidas ?? [], () => { setAgora(Date.now()); void refetch(); });
```
4. Filtro da aba "Palpitar" (D+1 dentro da fase):
```ts
const partidasFiltradas = filtrarHojeEProximoDia(
  (partidas ?? []).filter((p) => p.fase === faseSelecionada),
  agora
);
```
5. Hidratar rascunhos dos jogos FUTUROS visíveis (quando há userId):
```ts
useEffect(() => {
  if (!userId) return;
  const futuras = (partidas ?? []).filter((p) => estadoPalpite(p, agora) === "futuro");
  if (futuras.length === 0) return;
  setPlacaresLocais((prev) => {
    const next = { ...prev };
    for (const p of futuras) {
      if (next[p.id]) continue;
      const r = lerRascunho(userId, p.id);
      if (r) next[p.id] = r;
    }
    return next;
  });
  // hidrata uma vez por conjunto de partidas/usuário
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [userId, partidas]);
```
6. Persistir rascunho ao editar um jogo futuro — em `handleChangePlacar`, após calcular `next`, persista se o jogo for futuro:
```ts
function handleChangePlacar(partidaId: string, campo: "mandante" | "visitante", valor: string): void {
  setPlacaresLocais((prev) => {
    let valorNormalizado: string;
    if (valor === "") valorNormalizado = "";
    else {
      const num = parseInt(valor, 10);
      valorNormalizado = isNaN(num) ? "" : String(Math.min(20, Math.max(0, num)));
    }
    const anterior = prev[partidaId] ?? { mandante: "", visitante: "" };
    const atualizado = { ...anterior, [campo]: valorNormalizado };
    const partida = (partidas ?? []).find((p) => p.id === partidaId);
    if (userId && partida && estadoPalpite(partida, agora) === "futuro") {
      salvarRascunho(userId, partidaId, atualizado);
    }
    return { ...prev, [partidaId]: atualizado };
  });
}
```
7. `ehPendente` / `hasPendingChanges` / `pendentes` em `handleSalvar`: restrinja a LIBERADO:
```ts
const hasPendingChanges = (partidas ?? []).some(
  (p) => estadoPalpite(p, agora) === "liberado" && ehPendente(p.id)
);
// ...
const pendentes = (partidas ?? []).filter(
  (p) => estadoPalpite(p, agora) === "liberado" && ehPendente(p.id)
);
```
8. Após salvar com sucesso, limpe o rascunho local das partidas salvas:
```ts
for (const p of pendentes) {
  if (userId) limparRascunho(userId, p.id);
}
```
(coloque junto ao bloco que dá `delete next[p.id]`).
9. Passe `agora` para a `ListaPalpites`:
```tsx
<ListaPalpites
  partidas={partidasFiltradas}
  meusPalpites={meusPalpites ?? []}
  placaresLocais={placaresLocais}
  onChangePlacar={handleChangePlacar}
  isSaving={isSaving}
  agora={agora}
/>
```
10. Atualize o toast de sucesso para refletir os rascunhos:
```ts
toast.success("Palpites de hoje salvos!", { id: toastId });
```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/palpites/components/palpites-content.test.tsx`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte unit inteira (sem regressão)**

Run: `pnpm test:run`
Expected: PASS (441+ novos). Corrija fixtures de `Partida` que faltem `janelaInicio`.

- [ ] **Step 6: Commit**

```bash
git add src/features/palpites/components/palpites-content.tsx src/features/palpites/components/palpites-content.test.tsx
git commit -m "wire day-by-day mechanic into palpites screen"
```

---

## Task 11: E2E (Playwright)

**Files:**
- Create: `tests/e2e/palpite-dia-a-dia.spec.ts`

- [ ] **Step 1: Escrever o teste E2E**

Create `tests/e2e/palpite-dia-a-dia.spec.ts` seguindo o padrão de `tests/e2e/palpites.spec.ts` (mesmo `auth.setup`/login demo). Cobertura:
- Pré-condição: cenário com pelo menos um jogo HOJE (status agendada, dentro da janela) e um AMANHÃ.
- Jogo de hoje: digitar placar, clicar "Salvar palpites de hoje", ver toast de sucesso e badge "Salvo".
- Jogo de amanhã: ver o badge "Libera amanhã"; o campo aceita digitação; após `page.reload()` o valor digitado continua lá (rascunho).

```ts
import { test, expect } from "@playwright/test";

test.describe("palpite dia a dia", () => {
  test("hoje salva; amanhã fica em rascunho e sobrevive ao reload", async ({ page }) => {
    await page.goto("/palpites");
    // jogo de hoje (liberado)
    const inputsHoje = page.getByLabel(/Gols do/i);
    await inputsHoje.first().fill("2");
    await inputsHoje.nth(1).fill("1");
    await page.getByRole("button", { name: /salvar palpites de hoje/i }).click();
    await expect(page.getByText(/palpites de hoje salvos/i)).toBeVisible();

    // jogo de amanhã (rascunho)
    await expect(page.getByText(/libera amanhã/i).first()).toBeVisible();
    // digita no card futuro e recarrega
    // (selecionar o input do card "Libera amanhã" conforme estrutura real da página)
    await page.reload();
    await expect(page.getByText(/rascunho guardado/i).first()).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar o E2E**

Run: `pnpm test:e2e tests/e2e/palpite-dia-a-dia.spec.ts`
Expected: PASS. Ajuste seletores conforme a estrutura real renderizada.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/palpite-dia-a-dia.spec.ts
git commit -m "add e2e for day-by-day palpite flow"
```

---

## Task 12: Validação final

- [ ] **Step 1: Validar tudo**

Run: `pnpm validate`
Expected: type-check + lint + format + unit — todos verdes.

- [ ] **Step 2: Testes de banco**

Run: `pnpm test:db`
Expected: PASS.

- [ ] **Step 3: Cobertura dos módulos novos**

Run: `pnpm test:coverage`
Expected: `estado-palpite.ts`, `rascunho-local.ts`, `use-refetch-na-borda.ts` ~100% de linhas.

- [ ] **Step 4: Commit final (se houver ajustes de lint/format)**

```bash
git add -A
git commit -m "tidy day-by-day palpite mechanic"
```

---

## Self-review checklist (autor do plano)

- Spec coverage: borda inferior (T1) ✓ · contrato `janela_inicio` (T2) ✓ · estado 3-vias + D+1 (T3) ✓ · rascunho local (T4) ✓ · virada do dia (T5) ✓ · erro amigável (T6) ✓ · UI 3 estados (T7-T8) ✓ · botão só hoje (T9) ✓ · orquestração (T10) ✓ · testes 4 camadas (T1,T3,T4,T5,T7-T10,T11) ✓.
- Sem placeholders nas etapas de código novo (libs e migration têm código completo). As etapas de fixtures/E2E descrevem o ajuste exato a fazer no arquivo real.
- Consistência de tipos: `EstadoPalpite` ("liberado"|"futuro"|"encerrado") usado igual em T3/T7/T8/T10; `PlacarLocal` reusado de `card-palpite`; `janelaInicio` igual em entity/fetcher/libs.
