# Chaveamento + auto-avanço — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps usam checkbox (`- [ ]`).

**Goal:** Trigger que chaveia a próxima fase ao encerrar um jogo do mata-mata, uma tela de chaveamento (tema do app, scroll+zoom) que lê o estado, e um modal anunciando a tela.

**Architecture:** Auto-avanço 100% server-side (trigger Postgres genérica, sem tabela de topologia — usa os rótulos `W{n}`/`L{n}` + nova coluna `numero`). A tela é **leitora**: deriva a view do bracket a partir das `partidas` persistidas. Modal reusa a fila `AVISOS`.

**Tech Stack:** Postgres/Supabase (migration+trigger), Next.js/React/TS, Vitest, MSW, Playwright, `FlagIcon`.

## Global Constraints

- TS sem `any`; interfaces nomeadas; imports só de layers abaixo (`app→widgets→features→entities→shared`).
- UI 100% PT-BR. Tema claro, `brand-*`/`accent`, mobile-first, `FlagIcon` para escudos.
- Commits inglês imperativo curto; **sem** IA/Claude/Anthropic; **sem** Co-Authored-By. Micro-commits.
- Vencedor do mata-mata: maior placar; empate → `vencedor_penaltis` (pênaltis não pontuam, só decidem). `peso_fase` não muda.
- Trigger `security definer set search_path = public, pg_temp` (espelha `apurar_pontos`). Migration aplicada em prod pelo humano (`supabase db push`).
- Topologia oficial já em `scripts/lib/bracket-2026.ts` (`BRACKET_2026`, jogos 73–104).

---

### Task 1: Migration `numero` + trigger de auto-avanço

**Files:**
- Create: `supabase/migrations/0029_mata_mata_auto_avanco.sql`
- Modify: `supabase/seed.sql` (coluna `numero` nos 32 inserts do mata-mata)
- Test: `supabase/tests/` ou `*.db.test` conforme padrão de `test:db` (ver `vitest.db.config.ts`)

**Interfaces:** Produz a coluna `partidas.numero` e a trigger `avancar_mata_mata()`.

- [ ] **Step 1: Escrever a migration** (ver Parte 1.1 do spec `docs/features/chaveamento-bracket/spec.md`):
  - `alter table public.partidas add column numero smallint;`
  - Backfill: gerar os 32 pares `(fase, mandante_label, visitante_label, numero)` a partir de `BRACKET_2026` (rodar um `tsx` one-off OU copiar os valores do módulo) e aplicar `update public.partidas p set numero = v.numero from (values ...) v(fase,ml,vl,numero) where p.fase=v.fase and p.mandante_label=v.ml and p.visitante_label=v.vl;`
  - `create unique index partidas_numero_uidx on public.partidas (numero) where numero is not null;`
  - Função+trigger `avancar_mata_mata()`:
```sql
create or replace function public.avancar_mata_mata()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare venc uuid; perd uuid;
begin
  if new.status <> 'encerrada' or new.numero is null
     or new.gols_mandante is null or new.gols_visitante is null then
    return new;
  end if;
  venc := case
    when new.gols_mandante > new.gols_visitante then new.mandante_id
    when new.gols_visitante > new.gols_mandante then new.visitante_id
    else new.vencedor_penaltis end;
  if venc is null then return new; end if;
  perd := case when venc = new.mandante_id then new.visitante_id else new.mandante_id end;

  update public.partidas set mandante_id = venc where mandante_label = 'W'||new.numero;
  update public.partidas set visitante_id = venc where visitante_label = 'W'||new.numero;
  update public.partidas set mandante_id = perd where mandante_label = 'L'||new.numero;
  update public.partidas set visitante_id = perd where visitante_label = 'L'||new.numero;
  return new;
end; $$;

drop trigger if exists trg_avancar_mata_mata on public.partidas;
create trigger trg_avancar_mata_mata after update on public.partidas
  for each row execute function public.avancar_mata_mata();
```
- [ ] **Step 2: Atualizar `seed.sql`** — adicionar `numero` à coluna-lista do insert das partidas e os números 73–104 nas 32 linhas do mata-mata (grupos: `null`). Conferir contra `BRACKET_2026`.
- [ ] **Step 3: Teste test:db** (segue `vitest.db.config.ts`): num banco local com migrations+seed, `update partidas set status='encerrada', gols_mandante=2, gols_visitante=1, mandante_id=$BRA, visitante_id=$ARG where numero=74` → a partida `W74` (numero 89) passa a ter o lado = BRA. Empate com `vencedor_penaltis` → avança o vencedor dos pênaltis. Encerrar as duas semis → 3º lugar recebe os perdedores, final recebe os vencedores. Re-encerrar = mesmo resultado (idempotente).
- [ ] **Step 4: Aplicar local** `supabase db reset` (ou `db push`) e rodar `pnpm test:db` referente. Confirmar verde.
- [ ] **Step 5: Commit** — ex: `add knockout auto-advance trigger and match numbers`. (back)

> **NÃO** rodar `supabase db push` em prod — isso é do humano.

---

### Task 2: Cenário E2E confia na trigger

**Files:** Modify: `scripts/scenario-e2e.ts`

- [ ] **Step 1:** Garantir que, ao encerrar os jogos do mata-mata em ordem de fase, a trigger preenche as próximas (não precisa mais chamar `resolverMataMata` no seed; se hoje chama, simplificar pra confiar na trigger). Deixar **ao menos uma fase aberta** (sem encerrar todos) pra dar pra palpitar e os modais/novidade aparecerem. Manter idempotência e a guarda anti-prod existente.
- [ ] **Step 2:** `pnpm scenario:seed` no local; conferir por SQL que oitavas/quartas/semi/3º/final têm `mandante_id` real nas partidas esperadas (efeito da trigger).
- [ ] **Step 3: Commit** — ex: `rely on auto-advance trigger in e2e scenario`. (back)

---

### Task 3: Derivação do bracket (`derivar-bracket.ts`)

**Files:**
- Create: `src/features/chaveamento/lib/derivar-bracket.ts`, `src/features/chaveamento/index.ts`
- Test: `src/features/chaveamento/lib/derivar-bracket.test.ts`

**Interfaces:** ver Parte 2 do spec — `LadoConfronto`, `ConfrontoBracket`, `RodadaBracket`, `derivarBracket(partidas: Partida[]): RodadaBracket[]`. Importa `Partida`/`Selecao`/`FaseCopa`/`StatusPartida` de `@/entities/partida`.

- [ ] **Step 1: Teste (TDD)** cobrindo: ordem das rodadas (trinta-e-dois→…→final); `placeholder` `W74`→"Vencedor 74", `L101`→"Perdedor 101", grupo `1A` mantém "1A"; lado com `selecao` resolvida usa a seleção; `vencedor=true` no lado de maior placar quando encerrada; empate usa `vencedor_penaltis`; `gols` quando encerrada, null quando não.
- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implementar `derivarBracket`** puro: ordena por `numero`, agrupa por fase (ordem fixa), mapeia cada partida pra `ConfrontoBracket`; `placeholder` via regex `^([WL])(\d+)$` (W→"Vencedor n", L→"Perdedor n", senão o próprio label); `vencedor` só quando `status==='encerrada'`. Regra de vencedor local (3 linhas, não importar de scripts/lib).
- [ ] **Step 4: Run, PASS. type-check.**
- [ ] **Step 5: Commit** — ex: `add bracket view derivation`. (front)

---

### Task 4: Fetch + integração MSW (`bracket-fetcher.ts`)

**Files:**
- Create: `src/features/chaveamento/api/bracket-fetcher.ts`
- Test: `src/features/chaveamento/api/bracket-fetcher.test.ts` (MSW, padrão de `partidas-fetcher.test.ts`)

- [ ] **Step 1: Teste MSW (TDD)** — mock do endpoint `partidas` do Supabase (reusa o handler/padrão de `src/test/msw/` e `partidas-fetcher.test.ts`): retorna linhas das fases do mata-mata, `buscarPartidasMataMata()` devolve `Partida[]` com seleções resolvidas e labels.
- [ ] **Step 2: Run, FAIL.**
- [ ] **Step 3: Implementar `buscarPartidasMataMata()`** espelhando `src/features/partidas/api/partidas-fetcher.ts` (mesmo join/seleção), filtrando `fase in (...knockout)` e ordenando por `numero`.
- [ ] **Step 4: Run, PASS. type-check.**
- [ ] **Step 5: Commit** — ex: `add knockout bracket fetcher`. (front)

---

### Task 5: Tela de chaveamento + rota + acesso + modal

**Files:**
- Create: `src/features/chaveamento/components/{chaveamento-content,coluna-fase,card-confronto}.tsx` (+ testes de componente)
- Create: `src/app/chaveamento/page.tsx`
- Modify: aba Copa (`src/app/calendario/page.tsx` ou seu content) — link/segmento "Chaveamento"
- Modify: `src/features/novidades/model/aviso-atual.ts` — `AVISO_CHAVEAMENTO` (ver Parte 5 do spec), adicionar ao fim de `AVISOS`
- Test: `aviso-atual.test.ts` (estende), componentes (RTL)

**Interfaces:** Consome `derivarBracket` (Task 3), `buscarPartidasMataMata` (Task 4), `FlagIcon` de `@/shared/ui/flag-icon`.

- [ ] **Step 1: Componentes** (TDD por componente onde fizer sentido): `card-confronto` mostra dois `LadoConfronto` (FlagIcon + nome quando resolvido; círculo cinza + placeholder quando null), placar e destaque verde no vencedor. `coluna-fase` empilha confrontos de uma fase com título. `chaveamento-content` = container `overflow-auto` com as colunas lado a lado, linhas conectoras CSS, e controles de zoom (−/+) aplicando `transform: scale()` num wrapper (`useState` do zoom). Tema claro, `brand-*`/`accent`, PT-BR.
- [ ] **Step 2: Rota** `src/app/chaveamento/page.tsx` (client) usa React Query (`useQuery`) chamando `buscarPartidasMataMata` → `derivarBracket` → render. Loading/empty states simples.
- [ ] **Step 3: Acesso pela Copa** — adicionar no topo da aba Copa um segmento/botão "Chaveamento" (Link para `/chaveamento`). Não adicionar item fixo na bottom-nav (evita estouro). (pixel revisa o visual do acesso.)
- [ ] **Step 4: Modal** — adicionar `AVISO_CHAVEAMENTO` (id `chaveamento-2026`, gatilho `mata-mata-definido`) ao fim de `AVISOS`; estender `aviso-atual.test.ts` (id único, ordem, gatilho válido). O gate já mostra/persiste via "Bora!".
- [ ] **Step 5:** `pnpm test:run src/features/chaveamento src/features/novidades`; `pnpm type-check`; conferir responsivo (375/768/1280).
- [ ] **Step 6: Commit(s)** — micro-commits: ex `add chaveamento bracket screen`, `announce chaveamento screen with aviso`. (front + pixel)

---

### Task 6: E2E Playwright com evidências PNG (cobre as duas features)

**Files:**
- Create: `e2e/chaveamento/chaveamento.spec.ts`, `e2e/mata-mata-ate-final/fases.spec.ts`
- Output: `e2e/chaveamento/evidencias/*.png`, `e2e/mata-mata-ate-final/evidencias/*.png`

- [ ] **Step 1:** Spec do chaveamento (login dev, âncoras no topo — memória "E2E dev overlays vs bottom-nav"): abrir `/chaveamento` → rodadas com seleções reais + placeholders nas fases futuras; **print**; zoom/scroll operam; **print**. Estado pós-encerramento mostra a próxima fase chaveada (efeito da trigger no cenário); **print**. Modal "Veja o chaveamento!" no 1º acesso → "Bora!" → reload sem reaparecer; **print**.
- [ ] **Step 2:** Spec das fases (Feature A): para cada fase liberada, a aba ativa com confrontos reais + o modal da fase aparece/confirma/não reaparece; prova de pontuação ×2 numa oitava encerrada (10 pts); **prints** por passo.
- [ ] **Step 3:** Rodar `pnpm test:e2e e2e/chaveamento e2e/mata-mata-ate-final` (pré: `supabase start` + `pnpm scenario:seed`). Conferir PNGs gerados (não inventar). (qa)
- [ ] **Step 4:** `qa` valida evidências; `bug` revisa o código de todas as tasks de ambas as features.

---

## Self-Review (preenchido)

- **Cobertura do spec:** P1→Task 1; P2→Task 3; P3→Task 4; P4→Task 5; P5(modal)→Task 5 Step 4; P6(pontuação)→sem código; P7(testes)→Tasks 1(test:db),3(unit),4(MSW),6(E2E). ✔
- **Absorve Feature A pendente:** scenario (A-Task6)→Task 2; E2E das fases (A-Task7)→Task 6 Step 2. ✔
- **Placeholders:** sem TODO; trigger/derivação com código real; valores de `numero` derivam de `BRACKET_2026` (determinístico). ✔
- **Consistência de tipos:** `RodadaBracket`/`ConfrontoBracket`/`LadoConfronto` definidos na Task 3 e consumidos na 5; `buscarPartidasMataMata` (Task 4) consumido na 5; `Gatilho "mata-mata-definido"` já existe. ✔
- **Risco trigger:** Task 1 Step 3 (test:db cadeia completa) + índice único em `numero` + `security definer` + push em prod só pelo humano. ✔
