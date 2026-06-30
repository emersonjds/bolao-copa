# Pontuação do mata-mata ("quem avança") — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No mata-mata, a pontuação passa a valer "quem avança" (5 cravou vitória / 4 cravou empate / 3 acertou quem passa / 0 errou), × peso da fase; grupos inalterados.

**Architecture:** Fonte de verdade no servidor — `apurar_pontos()` (trigger no Supabase) ramifica por fase. O palpite ganha uma coluna `vencedor_avanca` (só usada quando o palpite é empate em jogo de mata-mata). UI mostra um seletor condicional. Uma migração re-apura os jogos de mata-mata já encerrados. Página de regras e um modal de aviso comunicam a mudança e o motivo.

**Tech Stack:** Next.js 16 / React 19 / TS / Tailwind 4 / Supabase (Postgres, RLS, RPC) / Vitest + Testing Library + MSW / Playwright / pnpm.

## Global Constraints

- UI 100% PT-BR; light mode padrão; tokens `brand-*`/`gold-*`/`gray-*`; mobile-first.
- Feature-Sliced: import só de camadas abaixo (`app → widgets → features → entities → shared`).
- Sem `any` (use `unknown` + narrowing); props com interface nomeada; nomes semânticos.
- Comentários só o "porquê" não-óbvio. Legível em ≤10s.
- Grants de `palpites` são **column-level** (0009 insert, 0026 update) — toda coluna nova precisa de grant explícito.
- A apuração é fonte de verdade do servidor; nunca confiar no cliente. `security definer` + `search_path = public, pg_temp`.
- Micro-commits atômicos, mensagens em inglês imperativo curto. **Proibido** qualquer traço de IA em commits/PRs (sem `Co-Authored-By`, sem menção a Claude/IA).
- Testes obrigatórios (3 camadas): unit, integração MSW, E2E com evidências PNG em `e2e/<feature>/evidencias/`.
- Pontuação base mata-mata (× `peso_fase`): **5** cravou vitória + quem passa · **4** cravou empate(90') + quem passa · **3** acertou quem passa · **0** errou quem passa. Grupos = `5/4/3/2/0` inalterado.

---

### Task 1: Migração — coluna `vencedor_avanca` + grants + validação

**Files:**
- Create: `supabase/migrations/0033_palpite_vencedor_avanca.sql`
- Test: `tests/db/palpite-vencedor-avanca.test.ts`

**Interfaces:**
- Produces: coluna `palpites.vencedor_avanca uuid` (FK `selecoes`), trigger `trg_validar_vencedor_avanca` que rejeita valor que não seja `mandante_id`/`visitante_id` da partida do palpite.

- [ ] **Step 1: Escrever a migração**

```sql
-- =============================================================================
-- 0033 — coluna vencedor_avanca em palpites (mata-mata: quem o palpiteiro acha
-- que passa quando o palpite é empate). Nullable; só preenchida nesse caso.
-- Grants de palpites são column-level (0009/0026): a coluna precisa de grant
-- explícito de insert/update, senão o upsert do app falha.
-- =============================================================================

alter table public.palpites
  add column vencedor_avanca uuid references public.selecoes (id);

grant insert (vencedor_avanca) on table public.palpites to authenticated;
grant update (vencedor_avanca) on table public.palpites to authenticated;

-- Integridade: quando preenchida, deve ser uma das duas seleções da partida.
create or replace function public.validar_vencedor_avanca()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  m uuid;
  v uuid;
begin
  if new.vencedor_avanca is null then
    return new;
  end if;
  select mandante_id, visitante_id into m, v
    from public.partidas where id = new.partida_id;
  if new.vencedor_avanca is distinct from m
     and new.vencedor_avanca is distinct from v then
    raise exception 'vencedor_avanca (%) nao e mandante nem visitante da partida %',
      new.vencedor_avanca, new.partida_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_validar_vencedor_avanca on public.palpites;
create trigger trg_validar_vencedor_avanca
  before insert or update on public.palpites
  for each row execute function public.validar_vencedor_avanca();
```

- [ ] **Step 2: Aplicar no banco local**

Run: `npx supabase migration up` (ou `supabase db reset` se preferir do zero)
Expected: aplica `0033` sem erro; `psql` mostra a coluna em `\d palpites`.

- [ ] **Step 3: Escrever o teste de banco**

```typescript
// Reusa o padrão de tests/db/mata-mata-auto-avanco.test.ts (pg Client, BEGIN/ROLLBACK).
// Carrega .env.test, conecta, pega 2 seleções e cria 1 partida + participante.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#")) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const db = new Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });

let selA: string, selB: string, selC: string, participante: string, partida: string;

beforeAll(async () => {
  await db.connect();
  const s = await db.query("select id from selecoes order by codigo limit 3");
  [selA, selB, selC] = s.rows.map((r) => r.id);
});
afterAll(async () => { await db.end(); });
beforeEach(async () => {
  await db.query("BEGIN");
  const p = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id, numero)
     values ('oitavas', now() + interval '1 hour', 'Arena', 'agendada', $1, $2, 9001) returning id`,
    [selA, selB]);
  partida = p.rows[0].id;
  const part = await db.query("insert into participantes (nome) values ('Teste') returning id");
  participante = part.rows[0].id;
});
afterEach(async () => { await db.query("ROLLBACK"); });

async function inserirPalpite(gm: number, gv: number, avanca: string | null) {
  return db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante, vencedor_avanca)
     values ($1, $2, $3, $4, $5)`,
    [participante, partida, gm, gv, avanca]);
}

describe("vencedor_avanca — validação", () => {
  it("aceita null", async () => {
    await expect(inserirPalpite(2, 1, null)).resolves.toBeDefined();
  });
  it("aceita o mandante da partida", async () => {
    await expect(inserirPalpite(1, 1, selA)).resolves.toBeDefined();
  });
  it("aceita o visitante da partida", async () => {
    await expect(inserirPalpite(1, 1, selB)).resolves.toBeDefined();
  });
  it("rejeita seleção que não joga a partida", async () => {
    await expect(inserirPalpite(1, 1, selC)).rejects.toThrow(/vencedor_avanca/);
  });
});
```

- [ ] **Step 4: Rodar o teste**

Run: `pnpm test:db tests/db/palpite-vencedor-avanca.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0033_palpite_vencedor_avanca.sql tests/db/palpite-vencedor-avanca.test.ts
git commit -m "add vencedor_avanca column with grants and validation"
```

---

### Task 2: Migração — `apurar_pontos()` por fase + re-apuração

**Files:**
- Create: `supabase/migrations/0034_apurar_pontos_mata_mata.sql`
- Test: `tests/db/apurar-pontos-mata-mata.test.ts`

**Interfaces:**
- Consumes: `peso_fase(text)` (0015), coluna `vencedor_avanca` (Task 1), `partidas.vencedor_penaltis`.
- Produces: `apurar_pontos()` ramificado por fase; backfill set-based reescreve `pontos` dos jogos de mata-mata já encerrados.

- [ ] **Step 1: Escrever a migração**

```sql
-- =============================================================================
-- 0034 — apuração por fase. Grupos seguem 5/4/3/2/0 (0015). Mata-mata passa a
-- valer "quem avança": 5 (cravou vitória + quem passa), 4 (cravou empate + quem
-- passa), 3 (acertou quem passa), 0 (errou quem passa) — tudo × peso_fase.
-- Pênaltis/prorrogação contam só para definir quem avança (vencedor_penaltis).
-- =============================================================================

create or replace function public.apurar_pontos()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  res_real int;
  peso int;
  avanca_real uuid;
  empate_real boolean;
begin
  if new.status <> 'encerrada'
     or new.gols_mandante is null or new.gols_visitante is null then
    return new;
  end if;

  peso := public.peso_fase(new.fase);

  if new.fase = 'grupos' then
    res_real := case
      when new.gols_mandante > new.gols_visitante then  1
      when new.gols_mandante < new.gols_visitante then -1
      else 0 end;
    update public.palpites pal
       set pontos = peso * (case
             when pal.gols_mandante = new.gols_mandante and pal.gols_visitante = new.gols_visitante
               then case when res_real = 0 then 4 else 5 end
             when case
                    when pal.gols_mandante > pal.gols_visitante then  1
                    when pal.gols_mandante < pal.gols_visitante then -1
                    else 0 end = res_real
               then case when res_real = 0 then 2 else 3 end
             else 0 end)
     where pal.partida_id = new.id;
    return new;
  end if;

  -- mata-mata: quem avança é rei
  empate_real := new.gols_mandante = new.gols_visitante;
  avanca_real := case
    when new.gols_mandante > new.gols_visitante then new.mandante_id
    when new.gols_visitante > new.gols_mandante then new.visitante_id
    else new.vencedor_penaltis end;

  if avanca_real is null then
    return new; -- empate no 90' sem vencedor definido: não resolvido, não pontua
  end if;

  update public.palpites pal
     set pontos = peso * (case
           when (case
                   when pal.gols_mandante > pal.gols_visitante then new.mandante_id
                   when pal.gols_visitante > pal.gols_mandante then new.visitante_id
                   else pal.vencedor_avanca end) = avanca_real
             then case
                    when pal.gols_mandante = new.gols_mandante
                     and pal.gols_visitante = new.gols_visitante
                      then case when empate_real then 4 else 5 end
                    else 3 end
           else 0 end)
   where pal.partida_id = new.id;

  return new;
end; $$;

-- ============================================================= re-apuração
-- Reescreve pontos dos jogos de mata-mata já encerrados pela regra nova.
-- Grupos não mudam. Set-based e idempotente.
update public.palpites pal
   set pontos = public.peso_fase(pt.fase) * (case
         when (case
                 when pal.gols_mandante > pal.gols_visitante then pt.mandante_id
                 when pal.gols_visitante > pal.gols_mandante then pt.visitante_id
                 else pal.vencedor_avanca end) =
              (case
                 when pt.gols_mandante > pt.gols_visitante then pt.mandante_id
                 when pt.gols_visitante > pt.gols_mandante then pt.visitante_id
                 else pt.vencedor_penaltis end)
           then case
                  when pal.gols_mandante = pt.gols_mandante
                   and pal.gols_visitante = pt.gols_visitante
                    then case when pt.gols_mandante = pt.gols_visitante then 4 else 5 end
                  else 3 end
         else 0 end)
  from public.partidas pt
 where pt.id = pal.partida_id
   and pt.fase <> 'grupos'
   and pt.status = 'encerrada'
   and pt.gols_mandante is not null
   and pt.gols_visitante is not null
   and (case
          when pt.gols_mandante > pt.gols_visitante then pt.mandante_id
          when pt.gols_visitante > pt.gols_mandante then pt.visitante_id
          else pt.vencedor_penaltis end) is not null;
```

- [ ] **Step 2: Aplicar no banco local**

Run: `npx supabase migration up`
Expected: aplica `0034` sem erro.

- [ ] **Step 3: Escrever os testes de banco**

```typescript
// Mesmo harness do Task 1 (pg Client, BEGIN/ROLLBACK, .env.test). Helper encerra
// a partida (UPDATE dispara apurar_pontos) e lê os pontos do palpite.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

for (const l of fs.readFileSync(path.join(process.cwd(), ".env.test"), "utf-8").split("\n")) {
  const m = l.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !l.trimStart().startsWith("#")) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const db = new Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });

let selA: string, selB: string, participante: string;

beforeAll(async () => {
  await db.connect();
  const s = await db.query("select id from selecoes order by codigo limit 2");
  [selA, selB] = s.rows.map((r) => r.id);
});
afterAll(async () => { await db.end(); });
beforeEach(async () => {
  await db.query("BEGIN");
  const part = await db.query("insert into participantes (nome) values ('Teste') returning id");
  participante = part.rows[0].id;
});
afterEach(async () => { await db.query("ROLLBACK"); });

// Cria partida de oitavas (peso ×2), faz um palpite, encerra e devolve pontos.
async function cenario(opts: {
  pgm: number; pgv: number; avanca: string | null;
  rgm: number; rgv: number; pen: string | null;
}): Promise<number> {
  const p = await db.query(
    `insert into partidas (fase, data_hora, estadio, status, mandante_id, visitante_id, numero)
     values ('oitavas', now() + interval '1 hour', 'Arena', 'agendada', $1, $2, 9002) returning id`,
    [selA, selB]);
  const partida = p.rows[0].id;
  await db.query(
    `insert into palpites (participante_id, partida_id, gols_mandante, gols_visitante, vencedor_avanca)
     values ($1, $2, $3, $4, $5)`,
    [participante, partida, opts.pgm, opts.pgv, opts.avanca]);
  await db.query(
    `update partidas set status='encerrada', gols_mandante=$2, gols_visitante=$3, vencedor_penaltis=$4 where id=$1`,
    [partida, opts.rgm, opts.rgv, opts.pen]);
  const r = await db.query("select pontos from palpites where partida_id=$1", [partida]);
  return r.rows[0].pontos as number;
}

describe("apurar_pontos — mata-mata (oitavas ×2)", () => {
  it("cravou vitória + quem passa = 5×2", async () => {
    expect(await cenario({ pgm: 2, pgv: 1, avanca: null, rgm: 2, rgv: 1, pen: null })).toBe(10);
  });
  it("acertou quem passa, placar errado = 3×2", async () => {
    expect(await cenario({ pgm: 2, pgv: 1, avanca: null, rgm: 1, rgv: 0, pen: null })).toBe(6);
  });
  it("apostou vencedor, jogo foi a pênaltis e o time passou = 3×2", async () => {
    expect(await cenario({ pgm: 2, pgv: 1, avanca: null, rgm: 0, rgv: 0, pen: selA })).toBe(6);
  });
  it("cravou empate + acertou quem passa = 4×2", async () => {
    expect(await cenario({ pgm: 1, pgv: 1, avanca: selA, rgm: 1, rgv: 1, pen: selA })).toBe(8);
  });
  it("cravou empate mas errou quem passa = 0", async () => {
    expect(await cenario({ pgm: 1, pgv: 1, avanca: selA, rgm: 1, rgv: 1, pen: selB })).toBe(0);
  });
  it("empate sem escolher quem passa = 0", async () => {
    expect(await cenario({ pgm: 1, pgv: 1, avanca: null, rgm: 1, rgv: 1, pen: selA })).toBe(0);
  });
  it("apontou o time errado = 0", async () => {
    expect(await cenario({ pgm: 0, pgv: 2, avanca: null, rgm: 0, rgv: 0, pen: selA })).toBe(0);
  });
});
```

- [ ] **Step 4: Rodar os testes**

Run: `pnpm test:db tests/db/apurar-pontos-mata-mata.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Garantir que os testes de grupos seguem verdes**

Run: `pnpm test:db`
Expected: todas as suítes de banco passam (grupos inalterados).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0034_apurar_pontos_mata_mata.sql tests/db/apurar-pontos-mata-mata.test.ts
git commit -m "score knockout by who advances and re-apurar finished matches"
```

---

### Task 3: Entidade Palpite + DTO + fetcher + queries

**Files:**
- Modify: `src/entities/palpite/model/palpite.ts`
- Modify: `src/features/palpites/api/palpites-fetcher.ts`
- Test: `src/features/palpites/api/palpites-fetcher.test.tsx` (ou o arquivo de teste MSW existente das queries)

**Interfaces:**
- Produces: `Palpite.vencedorAvanca: string | null`; `SalvarPalpiteInput.vencedorAvanca?: string | null`; upsert grava `vencedor_avanca`.

- [ ] **Step 1: Escrever o teste de integração (MSW) — upsert envia vencedor_avanca**

No arquivo de teste das queries de palpite (segue o padrão MSW de `src/test/msw/`), adicionar:

```typescript
it("envia vencedor_avanca no upsert quando informado", async () => {
  let bodyRecebido: unknown;
  server.use(
    http.post("*/rest/v1/palpites", async ({ request }) => {
      bodyRecebido = await request.json();
      return new HttpResponse(null, { status: 201 });
    }),
  );
  await salvarPalpite({
    participanteId: "p1", partidaId: "m1",
    golsMandante: 1, golsVisitante: 1, vencedorAvanca: "sel-brasil",
  });
  expect(bodyRecebido).toMatchObject({ vencedor_avanca: "sel-brasil" });
});
```

- [ ] **Step 2: Rodar — falha (campo ainda não existe)**

Run: `pnpm vitest run src/features/palpites/api`
Expected: FAIL (type error / campo ausente).

- [ ] **Step 3: Adicionar `vencedorAvanca` à entidade**

Em `src/entities/palpite/model/palpite.ts`, dentro de `interface Palpite`, após `pontos`:
```typescript
  vencedorAvanca: string | null;
```

- [ ] **Step 4: Atualizar DTO e payload no fetcher**

Em `src/features/palpites/api/palpites-fetcher.ts`:
- `interface PalpiteDb`: add `vencedor_avanca: string | null;`
- `mapPalpite`: add `vencedorAvanca: db.vencedor_avanca,`
- `interface SalvarPalpiteInput`: add `vencedorAvanca?: string | null;`
- no objeto do `upsert`, add `vencedor_avanca: input.vencedorAvanca ?? null,`
- garantir que o `select(...)` que lê palpites inclua `vencedor_avanca`.

- [ ] **Step 5: Rodar — passa**

Run: `pnpm vitest run src/features/palpites/api`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/entities/palpite/model/palpite.ts src/features/palpites/api/
git commit -m "carry vencedor_avanca through palpite entity and upsert"
```

---

### Task 4: UI — seletor "Quem passa?" no card de palpite

**Files:**
- Modify: `src/features/palpites/components/card-palpite.tsx`
- Modify: `src/features/palpites/components/palpites-content.tsx`
- Modify: `src/features/palpites/components/lista-palpites.tsx`
- Test: `src/features/palpites/components/card-palpite.test.tsx`, `palpites-content.test.tsx`

**Interfaces:**
- Consumes: `partida.fase`, `partida.mandante`, `partida.visitante`, `Palpite.vencedorAvanca`.
- Produces: prop `onChangeVencedorAvanca: (partidaId: string, selecaoId: string | null) => void`; estado `vencedoresAvanco` em `palpites-content`; validação que bloqueia salvar empate de mata-mata sem escolha.

- [ ] **Step 1: Teste — o seletor aparece só em mata-mata com empate**

Em `card-palpite.test.tsx`:
```typescript
it("mostra seletor 'Quem passa?' quando mata-mata e placar empatado", () => {
  render(<CardPalpite {...propsBase({ fase: "oitavas" })}
    placarLocal={{ mandante: "1", visitante: "1" }} estado="liberado" />);
  expect(screen.getByLabelText(/quem passa/i)).toBeInTheDocument();
});
it("não mostra o seletor em jogo de grupos", () => {
  render(<CardPalpite {...propsBase({ fase: "grupos" })}
    placarLocal={{ mandante: "1", visitante: "1" }} estado="liberado" />);
  expect(screen.queryByLabelText(/quem passa/i)).not.toBeInTheDocument();
});
it("não mostra o seletor quando o placar tem vencedor", () => {
  render(<CardPalpite {...propsBase({ fase: "oitavas" })}
    placarLocal={{ mandante: "2", visitante: "1" }} estado="liberado" />);
  expect(screen.queryByLabelText(/quem passa/i)).not.toBeInTheDocument();
});
```
(Em `terceiro-lugar` o rótulo é "Quem vence?" — adicionar um teste análogo.)

- [ ] **Step 2: Rodar — falha**

Run: `pnpm vitest run src/features/palpites/components/card-palpite.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implementar o seletor no `card-palpite.tsx`**

- Adicionar props: `vencedorAvanca: string | null;` e `onChangeVencedorAvanca: (selecaoId: string | null) => void;`.
- Derivar `const ehMataMata = partida.fase !== "grupos";`
- Derivar `const empate = placarLocal?.mandante !== "" && placarLocal?.mandante === placarLocal?.visitante;`
- Quando `estado === "liberado" && ehMataMata && empate`, renderizar abaixo dos inputs:
```tsx
<label className="mt-3 block">
  <span className="mb-1 block text-xs font-medium text-muted-foreground">
    {partida.fase === "terceiro-lugar" ? "Quem vence?" : "Quem passa?"}
  </span>
  <select
    aria-label={partida.fase === "terceiro-lugar" ? "Quem vence?" : "Quem passa?"}
    value={vencedorAvanca ?? ""}
    disabled={disabled}
    onChange={(e) => onChangeVencedorAvanca(e.target.value || null)}
    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
  >
    <option value="">Escolha quem passa</option>
    <option value={partida.mandante.id}>{partida.mandante.nome}</option>
    <option value={partida.visitante.id}>{partida.visitante.nome}</option>
  </select>
</label>
```

- [ ] **Step 4: Ligar estado e payload em `palpites-content.tsx` + `lista-palpites.tsx`**

- `const [vencedoresAvanco, setVencedoresAvanco] = useState<Record<string, string | null>>({});`
- inicializar a partir de `meusPalpites` (`vencedorAvanca`) e do rascunho local.
- `handleChangeVencedorAvanco(partidaId, selecaoId)` → atualiza estado (+ rascunho se futuro).
- estender `ehPendente`: também é pendente se `vencedoresAvanco[id]` difere do salvo.
- no save, montar `vencedorAvanca`: só quando `partida.fase !== "grupos"` e placar empatado; senão `null`.
- passar `vencedorAvanca`/`onChangeVencedorAvanco` por `lista-palpites.tsx` até o `CardPalpite`.

- [ ] **Step 5: Teste — bloqueia salvar empate de mata-mata sem escolha**

Em `palpites-content.test.tsx`:
```typescript
it("não salva empate de mata-mata sem escolher quem passa", async () => {
  // monta uma partida de oitavas, digita 1x1, clica salvar sem escolher
  // espera: salvarPalpite NÃO é chamado e aparece aviso de campo obrigatório
});
```
Implementar a validação no fluxo de save (impede o upsert e sinaliza o card).

- [ ] **Step 6: Rodar os testes de componente**

Run: `pnpm vitest run src/features/palpites/components`
Expected: PASS (incluindo os testes existentes que continuam válidos).

- [ ] **Step 7: Commit**

```bash
git add src/features/palpites/components/
git commit -m "add quem-passa selector for knockout draw predictions"
```

---

### Task 5: Página de regras — seção mata-mata + reescrita de pênaltis

**Files:**
- Modify: `src/features/regras/components/regras-content.tsx`
- Test: `src/features/regras/components/regras-content.test.tsx`, `src/app/regras/page.test.tsx`, `tests/e2e/regras.spec.ts`

**Interfaces:** nenhuma exportada nova — conteúdo estático.

- [ ] **Step 1: Teste — nova seção e textos do mata-mata**

Em `regras-content.test.tsx`:
```typescript
it("explica a pontuação do mata-mata (quem passa)", () => {
  render(<RegrasContent />);
  expect(screen.getByText(/Como funciona no mata-mata/i)).toBeInTheDocument();
  expect(screen.getByText(/quem passa/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm vitest run src/features/regras`
Expected: FAIL.

- [ ] **Step 3: Inserir a seção após "Multiplicador por fase"**

Após o bloco do multiplicador (≈ linha 233), antes de "Pontos por fase", seguindo o padrão visual (cards `rounded-2xl`, `brand-*`/`gold-*`):
```tsx
<section aria-labelledby="titulo-mata-mata">
  <h2 id="titulo-mata-mata" className="mb-1 font-display text-base font-bold text-foreground">
    Como funciona no mata-mata
  </h2>
  <p className="mb-3 text-xs text-muted-foreground">
    Na eliminatória não tem empate no fim: alguém sempre passa. Por isso o que vale é
    <strong> acertar quem avança</strong>. O placar do tempo normal entra como bônus.
  </p>
  <ul className="space-y-2 text-sm">
    <li><strong>5</strong> — cravou o placar de uma vitória e acertou quem passa</li>
    <li><strong>4</strong> — cravou o empate do tempo normal e acertou quem passa na decisão</li>
    <li><strong>3</strong> — acertou quem passa (placar errado)</li>
    <li><strong>0</strong> — errou quem passa</li>
  </ul>
  <p className="mt-3 text-xs text-muted-foreground">
    Prorrogação e pênaltis contam só para definir quem avança — não mudam o placar do
    tempo normal. Ao palpitar empate num jogo de mata-mata, escolha quem passa.
  </p>
</section>
```

- [ ] **Step 4: Reescrever o bloco "Pênaltis não contam"**

Trocar o texto antigo por: pênaltis/prorrogação **contam** para definir quem avança no mata-mata, mas o placar que vale para cravar é o do tempo normal (90'). Ajustar o teste correspondente se ele afirmava o contrário.

- [ ] **Step 5: Rodar os testes (unit + e2e da página)**

Run: `pnpm vitest run src/features/regras src/app/regras`
Expected: PASS. (E2E `tests/e2e/regras.spec.ts` roda no Task 8.)

- [ ] **Step 6: Commit**

```bash
git add src/features/regras/ src/app/regras/
git commit -m "document knockout scoring on rules page"
```

---

### Task 6: Modal de aviso — mudança + motivo + re-apuração

**Files:**
- Modify: `src/features/novidades/model/aviso-atual.ts`
- Test: `src/features/novidades/model/aviso-atual.test.ts`

**Interfaces:**
- Produces: `AVISO_PONTUACAO_MATA_MATA` adicionado a `AVISOS`.

- [ ] **Step 1: Atualizar o teste de ordem dos avisos**

Em `aviso-atual.test.ts`, no teste que checa a ordem, inserir `"pontuacao-mata-mata-2026-06"` na posição correta (antes de `"chaveamento-2026"`).

- [ ] **Step 2: Rodar — falha**

Run: `pnpm vitest run src/features/novidades/model`
Expected: FAIL.

- [ ] **Step 3: Definir o aviso e adicioná-lo a `AVISOS`**

Texto inicial (o agent `scribe` refina na execução, mantendo PT-BR claro e o porquê):
```typescript
export const AVISO_PONTUACAO_MATA_MATA: Aviso = {
  id: "pontuacao-mata-mata-2026-06",
  titulo: "Mudou a pontuação do mata-mata",
  gatilho: "mata-mata-definido",
  itens: [
    { emoji: "🎯", titulo: "Agora vale quem passa",
      descricao: "Na eliminatória não tem empate no fim — alguém sempre avança. Então o que pontua é acertar quem passa." },
    { emoji: "🏆", titulo: "Os pontos",
      descricao: "5 cravou a vitória e acertou quem passa; 4 cravou o empate e acertou quem passa; 3 acertou só quem passa; 0 errou quem passa. Tudo × peso da fase." },
    { emoji: "⚽", titulo: "Palpitou empate?",
      descricao: "Aí você escolhe quem passa na prorrogação ou nos pênaltis — eles contam só pra isso, não mudam o placar do tempo normal." },
    { emoji: "🔄", titulo: "Jogos que já passaram",
      descricao: "Repontuamos os jogos de mata-mata já encerrados pela regra nova, pra ficar tudo justo. Sua pontuação pode ter mudado." },
  ],
};
```
Adicionar a `AVISOS` antes de `AVISO_CHAVEAMENTO`.

- [ ] **Step 4: Rodar — passa**

Run: `pnpm vitest run src/features/novidades`
Expected: PASS (ordem + estrutura + gate genérico).

- [ ] **Step 5: Refinar o texto com o `scribe`**

Dispatch do agent `scribe` para revisar o copy (clareza PT-BR, tom do produto, explicar bem o motivo). Aplicar o retorno mantendo a estrutura.

- [ ] **Step 6: Commit**

```bash
git add src/features/novidades/model/
git commit -m "announce knockout scoring change with modal"
```

---

### Task 7: E2E + evidências + verificação final

**Files:**
- Create: `tests/e2e/pontuacao-mata-mata.spec.ts`
- Evidências: `e2e/pontuacao-mata-mata/evidencias/*.png`

- [ ] **Step 1: Escrever o spec E2E**

Cobrir, com prints (`page.screenshot`) em `e2e/pontuacao-mata-mata/evidencias/`:
1. Em `/palpites`, num jogo de mata-mata, digitar empate → aparece o seletor "Quem passa?"; salvar sem escolher → bloqueado; escolher e salvar → "Salvo".
2. `/regras` mostra a seção "Como funciona no mata-mata".
3. Modal "Mudou a pontuação do mata-mata" aparece no 1º acesso e some após "Bora!" (padrão de `chaveamento.spec.ts`, marcando avisos anteriores como vistos no localStorage).

- [ ] **Step 2: Subir ambiente e semear**

Run: `npx supabase start && pnpm scenario:seed`
Expected: cenário pronto (mata-mata com jogos abertos e encerrados).

- [ ] **Step 3: Rodar o E2E**

Run: `pnpm test:e2e tests/e2e/pontuacao-mata-mata.spec.ts`
Expected: todos passam; PNGs gerados.

- [ ] **Step 4: Verificação final completa**

Run (cada um, confirmando saída):
- `pnpm type-check` → sem erros
- `pnpm lint` → sem erros
- `pnpm vitest run` → unit + integração verdes
- `pnpm test:db` → banco verde
- `pnpm test:e2e` → E2E verde

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/pontuacao-mata-mata.spec.ts e2e/pontuacao-mata-mata/
git commit -m "add knockout scoring e2e specs and evidence"
```

---

## Self-Review

- **Cobertura da spec:** §2/§4 regra → Tasks 1,2; §3 dados → Tasks 1,3; §5 re-apuração → Task 2; §6 UI → Task 4; §7 regras → Task 5, modal → Task 6; §8 testes → distribuídos + Task 7. ✓
- **Grants column-level** (risco real do projeto) coberto no Task 1. ✓
- **Placeholders:** os blocos de UI (Tasks 4/5) referenciam props/arquivos exatos dos relatórios de exploração; copy do modal é concreto (scribe só refina). ✓
- **Consistência de tipos:** `vencedorAvanca: string | null` usado igual em entidade, DTO, input e props. ✓
