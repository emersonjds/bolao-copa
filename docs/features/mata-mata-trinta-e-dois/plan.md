# Mata-mata (Trinta e Dois) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development para implementar tarefa a tarefa. Steps usam checkbox (`- [ ]`).

**Goal:** Resolver os 16 confrontos das 32-avos a partir da classificação real do banco, destacar a fase atual na tela de palpites e anunciar o início do mata-mata + multiplicadores num banner que aparece 1×.

**Architecture:** Núcleo de resolução **puro e testável** em `scripts/lib/` (tabela oficial dos 8 melhores 3ºs + resolução de rótulos `1X`/`2X`/`3…` → seleção), consumido por um CLI one-off (`scripts/gerar-trinta-e-dois.ts`) que lê/grava o banco (local por padrão, `--prod` com confirmação). UI: aba ativa padrão = fase atual (deriva, sem `useEffect`). Banner: generaliza o gate de `novidades` para uma fila ordenada de avisos.

**Tech Stack:** TypeScript, Next 16/React 19, Vitest + MSW (unit/integ), Playwright (E2E), `pg` + `@supabase/supabase-js` (scripts), Supabase local.

## Global Constraints

- UI e textos 100% **PT-BR**. Domínio em PT-BR (Partida, Palpite, fase `trinta-e-dois`).
- Sem `any` (usar `unknown` + narrowing); props com interface nomeada; tipos explícitos em interfaces públicas.
- Imports só de camadas abaixo (`app → widgets → features → entities → shared`).
- Comentários: só o "porquê" não-óbvio.
- Commits **micro/atômicos**, mensagem em **inglês** imperativo curto, **sem nenhum traço de IA** (sem `Co-Authored-By`, sem menção a Claude/IA). Autor = o desenvolvedor.
- Antes de concluir cada tarefa: `pnpm type-check`, `pnpm lint`, testes da camada verdes, sem `console.log` (exceto scripts CLI, que já desabilitam a regra no topo).
- Pré-requisito de scripts/E2E/banco: `supabase start` + `.env.test`. Guard anti-prod obrigatório.
- `fase` das 32-avos é a string **`'trinta-e-dois'`** (não variar).

## Dados de referência (verificados no repo)

**16 partidas `trinta-e-dois` já existem no banco** (`supabase/seed.sql:129-144`), com data/estádio/rótulos. Pares (mandante_label × visitante_label):

```
2A×2B   1E×3A/B/C/D/F   1F×2C   1C×2F   1I×3C/D/F/G/H   2E×2I
1A×3C/E/F/H/I   1L×3E/H/I/J/K   1D×3B/E/F/I/J   1G×3A/E/H/I/J
2K×2L   1H×2J   1B×3E/F/G/I/J   1J×2H   1K×3D/E/I/J/L   2D×2G
```

**8 slots de 3º colocado** (com o adversário cabeça-de-grupo e o conjunto de candidatos):

| Adversário | Slot (candidatos) |
| ---------- | ----------------- |
| 1E | A/B/C/D/F |
| 1I | C/D/F/G/H |
| 1A | C/E/F/H/I |
| 1L | E/H/I/J/K |
| 1D | B/E/F/I/J |
| 1G | A/E/H/I/J |
| 1B | E/F/G/I/J |
| 1K | D/E/I/J/L |

**Classificação:** `derivarClassificacao(partidas)` (`src/features/grupos/lib/derivar-classificacao.ts`) devolve, por grupo, `linhas` ordenadas: `linhas[0]`=1º, `linhas[1]`=2º, `linhas[2]`=3º. Consome o modelo `Partida` (camelCase) de `@/entities/partida`.

---

## Task 1: Tabela oficial dos 8 melhores 3º (núcleo puro)

Atribui, dado QUAIS 8 dos 12 grupos classificaram seu 3º, qual grupo ocupa cada slot. É a parte delicada — **pesquisar a tabela oficial FIFA World Cup 2026 (third-placed teams allocation)** e encodar. Acionar o agent **`back`** para a pesquisa (WebSearch) + encoding, e o agent **`bug`** para revisar a tabela.

**Files:**
- Create: `scripts/lib/melhores-terceiros-2026.ts`
- Test: `scripts/lib/melhores-terceiros-2026.test.ts`

**Interfaces:**
- Produces:
  - `type Grupo = "A"|"B"|"C"|"D"|"E"|"F"|"G"|"H"|"I"|"J"|"K"|"L"`
  - `type SlotTerceiro = "1E"|"1I"|"1A"|"1L"|"1D"|"1G"|"1B"|"1K"` (o adversário identifica o slot)
  - `const CANDIDATOS_SLOT: Record<SlotTerceiro, Grupo[]>` — os conjuntos da tabela acima.
  - `function atribuirTerceiros(gruposQualificados: Grupo[]): Record<SlotTerceiro, Grupo>` — recebe exatamente 8 letras (os grupos cujos 3ºs passaram), devolve o mapeamento slot→grupo conforme a tabela oficial. Lança se não receber 8 grupos distintos.

- [ ] **Step 1: Escrever os testes que falham**

```ts
import { describe, it, expect } from "vitest";
import { atribuirTerceiros, CANDIDATOS_SLOT, type Grupo } from "./melhores-terceiros-2026";

const TODOS: Grupo[] = ["A","B","C","D","E","F","G","H","I","J","K","L"];
const SLOTS = Object.keys(CANDIDATOS_SLOT) as (keyof typeof CANDIDATOS_SLOT)[];

function combinacoes(arr: Grupo[], k: number): Grupo[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...rest] = arr;
  return [...combinacoes(rest, k - 1).map((c) => [head, ...c]), ...combinacoes(rest, k)];
}

describe("atribuirTerceiros — tabela oficial 2026", () => {
  it("resolve TODAS as 495 combinações (C(12,8)) sem conflito", () => {
    const combos = combinacoes(TODOS, 8);
    expect(combos).toHaveLength(495);
    for (const combo of combos) {
      const mapa = atribuirTerceiros(combo);
      const usados = SLOTS.map((s) => mapa[s]);
      // cada slot recebe um grupo do seu conjunto de candidatos
      for (const s of SLOTS) expect(CANDIDATOS_SLOT[s]).toContain(mapa[s]);
      // bijeção: usa exatamente os 8 grupos qualificados, sem repetir
      expect(new Set(usados)).toEqual(new Set(combo));
      expect(usados).toHaveLength(8);
    }
  });

  it("exige exatamente 8 grupos distintos", () => {
    expect(() => atribuirTerceiros(["A","B","C"] as Grupo[])).toThrow();
    expect(() => atribuirTerceiros(["A","A","B","C","D","E","F","G"] as Grupo[])).toThrow();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run scripts/lib/melhores-terceiros-2026.test.ts`
Expected: FAIL ("Cannot find module ./melhores-terceiros-2026").

- [ ] **Step 3: Implementar a tabela**

Pesquisar a tabela oficial (FIFA 2026 round-of-32 third-placed allocation) e encodar como `Record<string, Record<SlotTerceiro, Grupo>>`, chave = combinação ordenada das 8 letras (ex.: `"ABCDEFGH"`). `atribuirTerceiros` ordena a entrada, monta a chave, valida (8 distintos) e devolve a linha. `CANDIDATOS_SLOT` = a tabela de candidatos acima. Tipos explícitos, sem `any`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run scripts/lib/melhores-terceiros-2026.test.ts`
Expected: PASS (todas as 495 + validações).

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/melhores-terceiros-2026.ts scripts/lib/melhores-terceiros-2026.test.ts
git commit -m "add official 2026 best-third-placed allocation table"
```

---

## Task 2: Resolver os 16 confrontos a partir da classificação (núcleo puro)

**Files:**
- Create: `scripts/lib/resolver-trinta-e-dois.ts`
- Test: `scripts/lib/resolver-trinta-e-dois.test.ts`

**Interfaces:**
- Consumes: `atribuirTerceiros`, `Grupo`, `SlotTerceiro` (Task 1); `derivarClassificacao` + `ClassificacaoGrupo` de `@/features/grupos`.
- Produces:
  - `interface ConfrontoResolvido { mandanteLabel: string; visitanteLabel: string; mandanteId: string; visitanteId: string }`
  - `function resolverTrintaEDois(classificacao: ClassificacaoGrupo[]): ConfrontoResolvido[]` — para cada um dos 16 pares de rótulos (lista fixa, copiada do seed), resolve `1X`→`linhas[0]`, `2X`→`linhas[1]`, `3…`→ via `atribuirTerceiros` (rankeando os 12 terceiros por pontos→saldo→golsPro→nome e pegando os 8 melhores grupos). Lança se algum grupo não estiver finalizado ou faltar 1º/2º/3º.
  - `function ranquearTerceiros(classificacao: ClassificacaoGrupo[]): Grupo[]` (exportada p/ teste) — devolve os 8 grupos com melhores 3ºs, em ordem de ranking.

- [ ] **Step 1: Escrever o teste que falha**

Montar uma `classificacao` fake mínima (12 grupos finalizados, cada um com 3 `linhas` tendo `selecao.id`, `pontos`, `saldoGols`, `golsPro`, `selecao.nome`). Asserts:
- retorna 16 confrontos;
- `2A×2B` resolve para `linhas[1]` dos grupos A e B;
- `1E×3…` tem `mandanteId` = 1º do grupo E e `visitanteId` = 3º de um grupo candidato de `1E`;
- `ranquearTerceiros` devolve 8 grupos, ordenados por pontos desc (com saldo/golsPro como desempate).

```ts
import { describe, it, expect } from "vitest";
import { resolverTrintaEDois, ranquearTerceiros } from "./resolver-trinta-e-dois";
import type { ClassificacaoGrupo } from "@/features/grupos";
// helper fabricaClassificacao(...) monta os 12 grupos com placares determinísticos
// (definir no próprio teste). Ver dados de referência do plano para os candidatos.
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run scripts/lib/resolver-trinta-e-dois.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

- `PARES_ROTULO: ReadonlyArray<[string, string]>` = os 16 pares (copiar exatamente da seção "Dados de referência").
- `ranquearTerceiros`: coleta `linhas[2]` de cada grupo finalizado, ordena por `pontos→saldoGols→golsPro→nome`, pega os 8 → devolve as letras dos grupos.
- `resolverTrintaEDois`: monta `Map<Grupo, ClassificacaoGrupo>`; chama `atribuirTerceiros(ranquearTerceiros(...))`; resolve cada rótulo; valida presença. Sem `any`.

- [ ] **Step 4: Rodar e ver passar**

Run: `pnpm vitest run scripts/lib/resolver-trinta-e-dois.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/resolver-trinta-e-dois.ts scripts/lib/resolver-trinta-e-dois.test.ts
git commit -m "add round-of-32 matchup resolver from group standings"
```

---

## Task 3: CLI `gerar-trinta-e-dois.ts` (lê banco, confirma, grava)

CLI fino sobre o núcleo (padrão dos `scripts/`: o miolo é testado, o wrapper é fino). Acionar agent **`back`** (acesso a banco) na execução.

**Files:**
- Create: `scripts/gerar-trinta-e-dois.ts`
- Modify: `package.json` (script `"trinta-e-dois": "tsx scripts/gerar-trinta-e-dois.ts"`)

**Interfaces:**
- Consumes: `resolverTrintaEDois` (Task 2); `garantirEnvSupabase` (`scripts/lib/env.ts`); `pg` (mesmo `DATABASE_URL`/guard dos outros scripts).

- [ ] **Step 1: Implementar o script**

Fluxo:
1. Parse de flags: `--prod` e `--sim` (confirmação). Sem `--prod`, exige URL local (mesmo guard de `scenario-e2e.ts`). Com `--prod`, exige `--sim` explícito (padrão de `restore.ts`).
2. Lê partidas (`select` colunas snake_case) via `pg`/supabase-js; mapeia as de grupos para o modelo `Partida` camelCase (id, fase, grupo, mandante/visitante `Selecao`, golsMandante/golsVisitante, status) — reaproveitar o mapeamento do fetcher se existir; senão um `mapToPartida` local mínimo.
3. `classificacao = derivarClassificacao(partidasGrupos)`; valida 12 grupos finalizados (senão aborta com mensagem clara).
4. `confrontos = resolverTrintaEDois(classificacao)`.
5. **Imprime** a classificação resumida (1º/2º/3º por grupo) + os 16 confrontos resolvidos (nome × nome, data, estádio).
6. Se não houver `--sim`: imprime "rode com --sim para gravar" e sai (dry-run por padrão).
7. Com `--sim`: `UPDATE partidas SET mandante_id=$1, visitante_id=$2 WHERE fase='trinta-e-dois' AND mandante_label=$3 AND visitante_label=$4` para cada confronto. Idempotente. Loga linhas afetadas (deve ser 16).

- [ ] **Step 2: Testar dry-run no local**

Pré: `supabase start` + cenário com grupos finalizados (ver Task 6). 
Run: `pnpm trinta-e-dois`
Expected: imprime 16 confrontos com seleções reais; NÃO grava (dry-run).

- [ ] **Step 3: Gravar no local e conferir**

Run: `pnpm trinta-e-dois --sim`
Expected: "16 partidas atualizadas". Conferir no banco: `select mandante_label, mandante_id from partidas where fase='trinta-e-dois'` → todas com `mandante_id`/`visitante_id` preenchidos.

- [ ] **Step 4: Commit**

```bash
git add scripts/gerar-trinta-e-dois.ts package.json
git commit -m "add CLI to resolve and persist round-of-32 matchups"
```

---

## Task 4: Trinta e Dois em destaque (aba ativa = fase atual)

**Files:**
- Modify: `src/features/palpites/components/palpites-content.tsx`
- Test: `src/features/palpites/components/palpites-content.test.tsx` (ajustar/ampliar)

**Interfaces:**
- Produces: comportamento — fase ativa default = última fase em `fasesDisponiveis` com jogo `status !== "encerrada"`; senão a última disponível; senão `"grupos"`. Clique de aba sobrepõe.

- [ ] **Step 1: Escrever o teste que falha**

Teste (RTL) com `usePartidas` mockado retornando grupos todos `encerrada` + uma partida `trinta-e-dois` `agendada`: ao renderizar, a aba com `aria-selected="true"` é **"Trinta e Dois"**. Segundo teste: clicar em "Fase de Grupos" passa o `aria-selected` para ela.

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/features/palpites/components/palpites-content.test.tsx`
Expected: FAIL (default ainda é "grupos").

- [ ] **Step 3: Implementar**

- `const [faseSelecionada, setFaseSelecionada] = useState<FaseCopa | null>(null);`
- Derivar `faseAtual`:
```ts
const faseAtual: FaseCopa =
  [...fasesDisponiveis].reverse().find((f) =>
    listaPartidas.some((p) => p.fase === f && p.status !== "encerrada")
  ) ??
  fasesDisponiveis[fasesDisponiveis.length - 1] ??
  "grupos";
const faseEfetiva = faseSelecionada ?? faseAtual;
```
- Trocar usos de `faseSelecionada` por `faseEfetiva` (filtro de partidas + `<FiltroFase faseSelecionada={faseEfetiva} onSelect={setFaseSelecionada} />`).

- [ ] **Step 4: Rodar e ver passar + regressão local**

Run: `pnpm vitest run src/features/palpites`
Expected: PASS. Conferir que nenhum teste existente que assumia "grupos" default quebrou (se quebrou, ajustar para clicar a aba explicitamente).

- [ ] **Step 5: Commit**

```bash
git add src/features/palpites/components/palpites-content.tsx src/features/palpites/components/palpites-content.test.tsx
git commit -m "default palpites tab to the current active phase"
```

---

## Task 5: Banner do mata-mata (fila de avisos, 1×)

**Files:**
- Modify: `src/features/novidades/model/aviso-atual.ts` (adicionar `AVISOS` + novo aviso)
- Modify: `src/features/novidades/components/novidades-gate.tsx` (fila)
- Test: `src/features/novidades/components/novidades-gate.test.tsx` (ajustar p/ fila)

**Interfaces:**
- Consumes: `Aviso`, `avisoFoiVisto`/`marcarAvisoVisto`, `avisoVistoLocal`/`marcarAvisoVistoLocal`, `ModalNovidades` (já existem).
- Produces: `const AVISOS: Aviso[]` (ordem: `novidades-2026-06`, depois `mata-mata-2026-06`). Gate renderiza o **primeiro não visto**; ao fechar, marca e mostra o próximo.

- [ ] **Step 1: Escrever o aviso novo (conteúdo)**

Adicionar em `aviso-atual.ts`:
```ts
export const AVISO_MATA_MATA: Aviso = {
  id: "mata-mata-2026-06",
  titulo: "Começou o mata-mata!",
  itens: [
    { emoji: "🔥", titulo: "Trinta e Dois abertas",
      descricao: "Os confrontos das 32-avos já estão definidos — faça seus palpites antes do apito." },
    { emoji: "✖️", titulo: "Agora os pontos multiplicam",
      descricao: "Grupos, 32-avos e 3º lugar valem ×1. Oitavas e quartas ×2. Semi e final ×3 — cravar a final vale 15!" },
  ],
};
export const AVISOS: Aviso[] = [AVISO_ATUAL, AVISO_MATA_MATA];
```
(Manter `AVISO_ATUAL` exportado — id `novidades-2026-06` intacto.)

- [ ] **Step 2: Escrever os testes da fila (falham)**

Ajustar `novidades-gate.test.tsx`: com nenhum aviso visto → mostra o título de `AVISO_ATUAL`; ao fechar (marca visto) → mostra o título de `AVISO_MATA_MATA`; com ambos vistos → não renderiza. Anônimo via localStorage e logado via DB (mock `avisoFoiVisto` por id).

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm vitest run src/features/novidades`
Expected: FAIL.

- [ ] **Step 4: Implementar a fila no gate**

Generalizar: estado `avisoAtivo: Aviso | null`. `decidir()` itera `AVISOS` em ordem e seta o primeiro não visto (checando DB se logado, senão localStorage). `fechar()` marca o ativo como visto e re-roda a decisão (mostra o próximo). Render `avisoAtivo && <ModalNovidades aviso={avisoAtivo} onFechar={...} />`. Manter degradação silenciosa.

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm vitest run src/features/novidades`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/novidades/model/aviso-atual.ts src/features/novidades/components/novidades-gate.tsx src/features/novidades/components/novidades-gate.test.tsx
git commit -m "queue announcements and add knockout-phase banner"
```

---

## Task 6: Cenário E2E — 32-avos abertas com times reais

Estado mínimo para a tela: deixar as 16 `trinta-e-dois` **abertas** (`agendada`) com seleções reais (em vez de encerradas) e marcar o aviso do mata-mata como visto nas contas de teste (igual ao de novidades). Acionar agent **`qa`**.

**Files:**
- Modify: `scripts/scenario-e2e.ts`

**Interfaces:**
- Produces: após `pnpm scenario:seed`, as partidas `trinta-e-dois` ficam `agendada` com `mandante_id`/`visitante_id` reais e distintos; os demais mata-matas (oitavas→final) seguem encerrados com times reais (como hoje).

- [ ] **Step 1: Ajustar o seed**

No laço de encerramento (`run`), tratar `fase === "trinta-e-dois"` à parte: **não** encerrar — apenas `UPDATE` com `mandante_id`/`visitante_id` reais e distintos (reusar o pareamento `selIds`), mantendo `status='agendada'`, sem placar. Excluir essas 16 partidas da lista `fechados` (não geram palpite no seed; ficam abertas pra palpitar). No laço de contas, fazer `upsert` em `avisos_vistos` também para `aviso_id: "mata-mata-2026-06"`.

- [ ] **Step 2: Rodar o seed e ler o novo ranking**

Run: `pnpm scenario:seed`
Expected: relatório mostra `trinta-e-dois` com 0 jogos encerrados; imprime o novo ranking (anotar os pontos do líder/vice/lanterna para a Task 7).

- [ ] **Step 3: Commit**

```bash
git add scripts/scenario-e2e.ts
git commit -m "seed round-of-32 as open fixtures with real teams"
```

---

## Task 7: Ajustar specs E2E afetados pelo novo estado

O novo estado muda 3 specs. Acionar agent **`qa`**.

**Files:**
- Modify: `tests/e2e/ranking.spec.ts` (novos pontos determinísticos da Task 6)
- Modify: `tests/e2e/fases.spec.ts` (R32 deixa de aparecer no Histórico; passa a estar em Palpitar)
- Modify: `tests/e2e/palpites.spec.ts` (aba default agora é "Trinta e Dois"; clicar "Fase de Grupos" antes de interagir com o jogo de grupos liberado)

- [ ] **Step 1: ranking.spec** — substituir os pontos `473/417/74` pelos novos valores impressos pela Task 6 (líder/vice/lanterna). Atualizar o título do teste.

- [ ] **Step 2: fases.spec** — remover `{ fase: "Trinta e Dois", badge: /^R32$/ }` da lista de badges do Histórico e adicionar um teste curto: na aba **Palpitar**, a aba "Trinta e Dois" está ativa por padrão e mostra cards com nomes de seleções.

- [ ] **Step 3: palpites.spec** — após `page.goto("/palpites")`, clicar `getByRole("tab", { name: "Fase de Grupos" })` antes de pegar `inputsEditaveis` (o jogo de grupos liberado vive nessa aba; a default virou "Trinta e Dois").

- [ ] **Step 4: Rodar a suíte E2E afetada**

Run: `pnpm test:e2e -- ranking fases palpites`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/ranking.spec.ts tests/e2e/fases.spec.ts tests/e2e/palpites.spec.ts
git commit -m "update e2e specs for round-of-32 active phase"
```

---

## Task 8: E2E novo do mata-mata + evidências PNG

Acionar agent **`qa`**. Evidências em `e2e/mata-mata/evidencias/*.png` (CLAUDE.md §8).

**Files:**
- Create: `tests/e2e/mata-mata.spec.ts`
- Modify: `playwright.config.ts` (incluir o spec no projeto autenticado para o fluxo de palpite; o fluxo do banner reusa o projeto `novidades` de contexto limpo)
- Modify: `tests/e2e/novidades.spec.ts` (a sequência agora tem 2 banners: após fechar novidades aparece o do mata-mata)

**Interfaces:**
- Consumes: `loginComo` (`tests/e2e/helpers/login-demo`), estado da Task 6.

- [ ] **Step 1: Spec do banner (contexto limpo)**

Em `novidades.spec.ts` (projeto `novidades`, sem semente): carrega `/` → modal "Novidades no bolão" visível (print `01-novidades.png`) → "Bora!" → aparece modal "Começou o mata-mata!" (print `02-mata-mata.png`) → "Bora!" → sem dialog → reload → sem dialog. Salvar PNGs em `e2e/mata-mata/evidencias/`.

- [ ] **Step 2: Spec do palpite nas 32-avos (autenticado)**

`mata-mata.spec.ts`: `loginComo(context, "demo@bolao.test")` → `/palpites` → aba "Trinta e Dois" ativa por padrão (print `03-trinta-e-dois-destaque.png`) → cards mostram nomes de seleções reais → preenche o 1º jogo aberto e salva → "Palpites salvos!" (print `04-palpite-salvo.png`). Adicionar `mata-mata.spec.ts` ao `testMatch` do projeto `authenticated`.

- [ ] **Step 3: Rodar e gerar evidências**

Run: `pnpm test:e2e -- novidades mata-mata`
Expected: PASS; 4 PNGs gerados.

- [ ] **Step 4: Copiar evidências versionadas**

Copiar os PNGs de `test-results/...` para `e2e/mata-mata/evidencias/` (convenção do projeto). Não inventar prints — só os gerados pelo run.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/mata-mata.spec.ts tests/e2e/novidades.spec.ts playwright.config.ts e2e/mata-mata/evidencias/
git commit -m "add round-of-32 and knockout-banner e2e with evidence"
```

---

## Task 9: Quality gate + docs

Acionar agent **`bug`** (revisão geral) e **`scribe`** (docs/i18n).

**Files:**
- Modify: `docs/README.md` (indexar a feature `mata-mata-trinta-e-dois` com spec ✓ / plan ✓)
- Modify: `docs/PROJETO.md` (estado atual: mata-mata iniciado; contagem de testes se mudou)

- [ ] **Step 1: Suíte completa**

Run: `pnpm type-check && pnpm lint && pnpm test:run && pnpm test:e2e`
Expected: tudo verde. (Confirmar `pnpm test:db` se algo de banco mudou — aqui não muda schema, mas rodar por garantia.)

- [ ] **Step 2: Revisão `bug`** — apontar a tabela dos 3ºs, a resolução e a fila de avisos como pontos de atenção. Corrigir achados.

- [ ] **Step 3: Atualizar índice e handbook (`scribe`)** — nova linha na tabela de Features do README; nota no PROJETO.md (§10) de que o mata-mata começou.

- [ ] **Step 4: Commit**

```bash
git add docs/README.md docs/PROJETO.md
git commit -m "document knockout phase rollout"
```

---

## Promoção pra prod (fora do escopo automatizado — humano)

Depois do merge: rodar `pnpm trinta-e-dois --prod` (dry-run), conferir os 16 confrontos impressos contra a classificação real, e só então `pnpm trinta-e-dois --prod --sim`. O push e a execução em prod são **sempre do desenvolvedor humano**.

## Self-review (cobertura do spec)

- Parte 1 (resolver confrontos) → Tasks 1, 2, 3. ✓
- Parte 2 (fase em destaque) → Task 4. ✓
- Parte 3 (banner 1×) → Task 5. ✓
- Parte 4 (3 camadas de teste + evidência PNG) → Tasks 1/2 (unit), 5 (integ via gate), 6/7/8 (E2E + PNG). ✓
- Risco "tabela incorreta" → teste exaustivo (Task 1) + confirmação humana (Task 3) + prod só pelo humano. ✓
