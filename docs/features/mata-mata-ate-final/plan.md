# Mata-mata até a final Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver os confrontos de oitavas → final + 3º lugar conforme cada rodada do mata-mata encerra, e mostrar um modal de aviso (confirmado pelo usuário) a cada fase liberada.

**Architecture:** Núcleo puro e testável em `scripts/lib/` (topologia do bracket + resolver de progressão), exposto por um CLI idempotente (`gerar-mata-mata.ts`). UI reusa a fila de avisos existente (`AVISOS` + `ModalNovidades` + `avisos_vistos`), generalizando o gatilho de "fase pronta". Pontuação por fase já existe (`peso_fase`, 0015) — não muda.

**Tech Stack:** Next.js 16 / React 19 / TS, Vitest (unit), MSW (integração), Playwright (E2E), `pg` (scripts CLI), Supabase.

## Global Constraints

- TypeScript sem `any` (use `unknown` + narrowing); interfaces nomeadas em APIs públicas.
- 100% dos textos de UI em **PT-BR**.
- Comentários só o "porquê" não-óbvio (regra de negócio/armadilha); proibido narrar código.
- Commits em **inglês**, imperativo curto; **sem** menção a IA/Claude/Anthropic, **sem** `Co-Authored-By`. Micro-commits atômicos.
- Import só de layers abaixo (`app → widgets → features → entities → shared`).
- Mata-mata: pênaltis **não pontuam** mas **definem** quem avança. `peso_fase` não muda (×1 grupos/32-avos/3º, ×2 oitavas/quartas, ×3 semi/final).
- Numeração do bracket = **número oficial FIFA 2026** (73–104). Verificar contra a fonte oficial antes de gravar em prod.

---

### Task 1: Topologia do bracket (`bracket-2026.ts`)

**Files:**
- Create: `scripts/lib/bracket-2026.ts`
- Test: `scripts/lib/bracket-2026.test.ts`

**Interfaces:**
- Produces: `type FaseMataMata`, `interface PartidaBracket { numero: number; fase: FaseMataMata; mandanteLabel: string; visitanteLabel: string }`, `const BRACKET_2026: readonly PartidaBracket[]`, `function partidaPorNumero(numero: number): PartidaBracket | undefined`.

**Dados** (extraídos de `supabase/seed.sql` linhas 129–160, na ordem do seed = ordem do número oficial; oitavas+ verificadas contra o bracket oficial pelo agent `back`):

| nº | fase | mandante | visitante |
|----|------|----------|-----------|
| 73 | trinta-e-dois | 2A | 2B |
| 74 | trinta-e-dois | 1E | 3A/B/C/D/F |
| 75 | trinta-e-dois | 1F | 2C |
| 76 | trinta-e-dois | 1C | 2F |
| 77 | trinta-e-dois | 1I | 3C/D/F/G/H |
| 78 | trinta-e-dois | 2E | 2I |
| 79 | trinta-e-dois | 1A | 3C/E/F/H/I |
| 80 | trinta-e-dois | 1L | 3E/H/I/J/K |
| 81 | trinta-e-dois | 1D | 3B/E/F/I/J |
| 82 | trinta-e-dois | 1G | 3A/E/H/I/J |
| 83 | trinta-e-dois | 2K | 2L |
| 84 | trinta-e-dois | 1H | 2J |
| 85 | trinta-e-dois | 1B | 3E/F/G/I/J |
| 86 | trinta-e-dois | 1J | 2H |
| 87 | trinta-e-dois | 1K | 3D/E/I/J/L |
| 88 | trinta-e-dois | 2D | 2G |
| 89 | oitavas | W74 | W77 |
| 90 | oitavas | W73 | W75 |
| 91 | oitavas | W76 | W78 |
| 92 | oitavas | W79 | W80 |
| 93 | oitavas | W83 | W84 |
| 94 | oitavas | W81 | W82 |
| 95 | oitavas | W86 | W88 |
| 96 | oitavas | W85 | W87 |
| 97 | quartas | W89 | W90 |
| 98 | quartas | W93 | W94 |
| 99 | quartas | W91 | W92 |
| 100 | quartas | W95 | W96 |
| 101 | semifinal | W97 | W98 |
| 102 | semifinal | W99 | W100 |
| 103 | terceiro-lugar | L101 | L102 |
| 104 | final | W101 | W102 |

- [ ] **Step 1: `back` agent verifica os números 89–104 contra o bracket oficial FIFA 2026** (Anexo/diagrama oficial). Corrige a tabela acima se a ordem do seed divergir. Anota a fonte no topo do arquivo.

- [ ] **Step 2: Write the failing test** (`scripts/lib/bracket-2026.test.ts`)

```ts
import { describe, it, expect } from "vitest";
import { BRACKET_2026, partidaPorNumero } from "./bracket-2026";

const REF = /^([WL])(\d+)$/;

describe("BRACKET_2026", () => {
  it("tem 32 partidas numeradas 73..104 sem repetição", () => {
    const nums = BRACKET_2026.map((p) => p.numero).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 32 }, (_, i) => 73 + i));
  });

  it("toda referência W{n}/L{n} aponta para uma partida existente de número menor", () => {
    for (const p of BRACKET_2026) {
      for (const label of [p.mandanteLabel, p.visitanteLabel]) {
        const m = label.match(REF);
        if (!m) continue; // rótulo de grupo (1A/2B/3...), só nas 32-avos
        const alvo = partidaPorNumero(Number(m[2]));
        expect(alvo, `${label} em #${p.numero}`).toBeDefined();
        expect(alvo!.numero).toBeLessThan(p.numero);
      }
    }
  });

  it("forma árvore de eliminação simples: cada partida 73..102 é referida exatamente uma vez adiante (102 duas: final e 3º)", () => {
    const refs = new Map<number, number>();
    for (const p of BRACKET_2026) {
      for (const label of [p.mandanteLabel, p.visitanteLabel]) {
        const m = label.match(REF);
        if (m) refs.set(Number(m[2]), (refs.get(Number(m[2])) ?? 0) + 1);
      }
    }
    for (let n = 73; n <= 100; n++) expect(refs.get(n), `#${n}`).toBe(1);
    expect(refs.get(101)).toBe(1); // só a final
    expect(refs.get(102)).toBe(1); // 101 e 102 alimentam final + 3º; ver teste abaixo
  });

  it("perdedores das semis (101,102) alimentam o 3º lugar; vencedores, a final", () => {
    const terceiro = BRACKET_2026.find((p) => p.fase === "terceiro-lugar")!;
    const final = BRACKET_2026.find((p) => p.fase === "final")!;
    expect([terceiro.mandanteLabel, terceiro.visitanteLabel].sort()).toEqual(["L101", "L102"]);
    expect([final.mandanteLabel, final.visitanteLabel].sort()).toEqual(["W101", "W102"]);
  });

  it("conta por fase: 16 32-avos, 8 oitavas, 4 quartas, 2 semis, 1 terceiro, 1 final", () => {
    const por = (f: string) => BRACKET_2026.filter((p) => p.fase === f).length;
    expect([por("trinta-e-dois"), por("oitavas"), por("quartas"), por("semifinal"), por("terceiro-lugar"), por("final")])
      .toEqual([16, 8, 4, 2, 1, 1]);
  });
});
```

> Nota sobre o teste "exatamente uma vez": 101 e 102 são referidos **duas** vezes cada (W na final, L no 3º). Ajustar o terceiro teste para contar `refs.get(101)===2` e `refs.get(102)===2`, e 73..100 ===1. (O implementador corrige a asserção ao escrever — a regra correta é: 73–100 → 1 referência; 101,102 → 2 referências.)

- [ ] **Step 3: Run test, verify it fails** — `pnpm test:run scripts/lib/bracket-2026.test.ts` → FAIL (módulo não existe).

- [ ] **Step 4: Write `bracket-2026.ts`** com a tabela acima como `BRACKET_2026` e o lookup:

```ts
export type FaseMataMata =
  | "trinta-e-dois" | "oitavas" | "quartas" | "semifinal" | "terceiro-lugar" | "final";

export interface PartidaBracket {
  numero: number;
  fase: FaseMataMata;
  mandanteLabel: string;
  visitanteLabel: string;
}

// Número oficial FIFA 2026 de cada jogo do mata-mata (73..104). Fonte: bracket
// oficial; ordem espelha supabase/seed.sql. Verificado em bracket-2026.test.ts.
export const BRACKET_2026: readonly PartidaBracket[] = [ /* 32 entradas da tabela */ ];

const POR_NUMERO = new Map(BRACKET_2026.map((p) => [p.numero, p]));
export function partidaPorNumero(numero: number): PartidaBracket | undefined {
  return POR_NUMERO.get(numero);
}
```

- [ ] **Step 5: Run test, verify PASS** — `pnpm test:run scripts/lib/bracket-2026.test.ts`.

- [ ] **Step 6: Type-check** — `pnpm type-check`.

---

### Task 2: Resolver de progressão (`resolver-mata-mata.ts`)

**Files:**
- Create: `scripts/lib/resolver-mata-mata.ts`
- Test: `scripts/lib/resolver-mata-mata.test.ts`

**Interfaces:**
- Consumes: `BRACKET_2026`, `partidaPorNumero`, `FaseMataMata` de `./bracket-2026`; `StatusPartida` de `@/entities/partida`.
- Produces:
```ts
export interface PartidaResultado {
  numero: number; fase: FaseMataMata;
  mandanteId: string | null; visitanteId: string | null;
  golsMandante: number | null; golsVisitante: number | null;
  vencedorPenaltis: string | null; status: StatusPartida;
}
export interface ConfrontoResolvido {
  fase: FaseMataMata; mandanteLabel: string; visitanteLabel: string;
  mandanteId: string; visitanteId: string;
}
export function resolverMataMata(partidas: PartidaResultado[]): ConfrontoResolvido[];
```

**Regras:** vencedor = maior placar; empate no tempo normal → `vencedorPenaltis`; perdedor = o outro lado. Só resolve partidas das fases oitavas→final **ainda não resolvidas** (`mandanteId`/`visitanteId` null) e só quando **ambos** os lados ficam determinados.

- [ ] **Step 1: Write the failing test** (`scripts/lib/resolver-mata-mata.test.ts`) — cobre: vitória por placar, empate→pênaltis, perdedor→3º lugar, resolve só com ambos os lados prontos, idempotência (partida já resolvida não retorna), cadeia (oitavas encerradas → quarta resolve).

```ts
import { describe, it, expect } from "vitest";
import { resolverMataMata, type PartidaResultado } from "./resolver-mata-mata";

function enc(numero: number, fase: PartidaResultado["fase"], m: string, v: string,
            gm: number, gv: number, pen: string | null = null): PartidaResultado {
  return { numero, fase, mandanteId: m, visitanteId: v, golsMandante: gm, golsVisitante: gv,
           vencedorPenaltis: pen, status: "encerrada" };
}
function aberta(numero: number, fase: PartidaResultado["fase"]): PartidaResultado {
  return { numero, fase, mandanteId: null, visitanteId: null, golsMandante: null,
           golsVisitante: null, vencedorPenaltis: null, status: "agendada" };
}

describe("resolverMataMata", () => {
  it("resolve uma oitava: vencedores das 32-avos 74 e 77 viram mandante/visitante", () => {
    const p = [
      enc(74, "trinta-e-dois", "BRA", "ARG", 2, 1),
      enc(77, "trinta-e-dois", "FRA", "ESP", 0, 3),
      aberta(89, "oitavas"),
    ];
    const r = resolverMataMata(p);
    expect(r).toContainEqual({ fase: "oitavas", mandanteLabel: "W74", visitanteLabel: "W77",
      mandanteId: "BRA", visitanteId: "ESP" });
  });

  it("empate no tempo normal usa o vencedor dos pênaltis para avançar", () => {
    const p = [
      enc(73, "trinta-e-dois", "ITA", "GER", 1, 1, "GER"),
      enc(75, "trinta-e-dois", "POR", "NED", 2, 0),
      aberta(90, "oitavas"),
    ];
    const r = resolverMataMata(p);
    expect(r[0]).toMatchObject({ mandanteId: "GER", visitanteId: "POR" });
  });

  it("não resolve quando só um lado está determinado", () => {
    const p = [enc(74, "trinta-e-dois", "BRA", "ARG", 2, 1), aberta(89, "oitavas")]; // falta 77
    expect(resolverMataMata(p)).toEqual([]);
  });

  it("ignora partida já resolvida (idempotência)", () => {
    const p = [
      enc(74, "trinta-e-dois", "BRA", "ARG", 2, 1),
      enc(77, "trinta-e-dois", "FRA", "ESP", 0, 3),
      { ...aberta(89, "oitavas"), mandanteId: "BRA", visitanteId: "ESP" },
    ];
    expect(resolverMataMata(p)).toEqual([]);
  });

  it("terceiro lugar recebe os PERDEDORES das semis", () => {
    const p = [
      enc(101, "semifinal", "BRA", "FRA", 2, 0),
      enc(102, "semifinal", "ARG", "ESP", 1, 1, "ARG"),
      aberta(103, "terceiro-lugar"),
      aberta(104, "final"),
    ];
    const r = resolverMataMata(p);
    expect(r).toContainEqual({ fase: "terceiro-lugar", mandanteLabel: "L101", visitanteLabel: "L102",
      mandanteId: "FRA", visitanteId: "ESP" });
    expect(r).toContainEqual({ fase: "final", mandanteLabel: "W101", visitanteLabel: "W102",
      mandanteId: "BRA", visitanteId: "ARG" });
  });
});
```

- [ ] **Step 2: Run test, verify FAIL** — `pnpm test:run scripts/lib/resolver-mata-mata.test.ts`.

- [ ] **Step 3: Write `resolver-mata-mata.ts`:**

```ts
import { BRACKET_2026, partidaPorNumero, type FaseMataMata } from "./bracket-2026";
import type { StatusPartida } from "@/entities/partida";

export interface PartidaResultado { /* ...da interface acima... */ }
export interface ConfrontoResolvido { /* ...da interface acima... */ }

const REF = /^([WL])(\d+)$/;
const FASES_A_RESOLVER: FaseMataMata[] = ["oitavas", "quartas", "semifinal", "terceiro-lugar", "final"];

function vencedor(p: PartidaResultado): string | null {
  if (p.status !== "encerrada" || p.golsMandante === null || p.golsVisitante === null) return null;
  if (p.golsMandante > p.golsVisitante) return p.mandanteId;
  if (p.golsVisitante > p.golsMandante) return p.visitanteId;
  return p.vencedorPenaltis;
}
function perdedor(p: PartidaResultado): string | null {
  const venc = vencedor(p);
  if (!venc) return null;
  return venc === p.mandanteId ? p.visitanteId : p.mandanteId;
}

export function resolverMataMata(partidas: PartidaResultado[]): ConfrontoResolvido[] {
  const porNumero = new Map(partidas.map((p) => [p.numero, p]));
  const resolverLabel = (label: string): string | null => {
    const m = label.match(REF);
    if (!m) return null;
    const origem = porNumero.get(Number(m[2]));
    if (!origem) return null;
    return m[1] === "W" ? vencedor(origem) : perdedor(origem);
  };

  const out: ConfrontoResolvido[] = [];
  for (const slot of BRACKET_2026) {
    if (!FASES_A_RESOLVER.includes(slot.fase)) continue;
    const atual = porNumero.get(slot.numero);
    if (atual?.mandanteId && atual?.visitanteId) continue; // já resolvida
    const mandanteId = resolverLabel(slot.mandanteLabel);
    const visitanteId = resolverLabel(slot.visitanteLabel);
    if (mandanteId && visitanteId) {
      out.push({ fase: slot.fase, mandanteLabel: slot.mandanteLabel,
        visitanteLabel: slot.visitanteLabel, mandanteId, visitanteId });
    }
  }
  return out;
}
```

- [ ] **Step 4: Run test, verify PASS.** **Step 5: type-check.**

---

### Task 3: CLI `gerar-mata-mata.ts` + script

**Files:**
- Create: `scripts/gerar-mata-mata.ts`
- Modify: `package.json` (script `"mata-mata": "tsx scripts/gerar-mata-mata.ts"`)

**Interfaces:** Consumes `resolverMataMata`, `PartidaResultado` de `./lib/resolver-mata-mata`; espelha as guardas de `scripts/gerar-trinta-e-dois.ts` (`garantirEnvSupabase`, `--prod`/`--sim`, `confirmarProd`, `pg.Client`).

- [ ] **Step 1: Implementar o CLI** seguindo `gerar-trinta-e-dois.ts`:
  - `SELECT numero?, fase, mandante_id, visitante_id, gols_mandante, gols_visitante, vencedor_penaltis, status, mandante_label, visitante_label, estadio, data_hora` das partidas onde `fase` ∈ {trinta-e-dois,oitavas,quartas,semifinal,terceiro-lugar,final}. **Como o seed não tem coluna `numero`**, mapear cada linha ao número via `BRACKET_2026` por `(fase, mandante_label, visitante_label)`.
  - Montar `PartidaResultado[]`, chamar `resolverMataMata`.
  - Imprimir relatório: confrontos resolvíveis agora (nomes pt-BR via `nomeSelecaoPt`, data `AT TIME ZONE 'America/Sao_Paulo'`, estádio) + lista do que ainda falta encerrar por fase.
  - `--sim`: `UPDATE partidas SET mandante_id=$1, visitante_id=$2 WHERE fase=$3 AND mandante_label=$4 AND visitante_label=$5`. Idempotente.
  - Guarda de ambiente idêntica (`--prod` exige `--sim` + digitar `GRAVAR`).
- [ ] **Step 2: Smoke local** — `pnpm mata-mata` (dry-run) num banco com 32-avos encerradas: imprime oitavas resolvíveis, não grava. (Requer Supabase local + scenario seed; se indisponível, validar via os testes unit do resolver.)
- [ ] **Step 3: type-check + lint.**

---

### Task 4: Gatilho por fase (`fase-pronta.ts`)

**Files:**
- Rename/replace: `src/features/novidades/api/mata-mata-pronto.ts` → `src/features/novidades/api/fase-pronta.ts`
- Test: `src/features/novidades/api/fase-pronta.test.ts` (mover de `mata-mata-pronto.test.ts`)

**Interfaces:**
- Produces: `function faseDefinida(fase: FaseMataMata): Promise<boolean>`; manter `export const mataMataDefinido = () => faseDefinida("trinta-e-dois")` para compat dos imports atuais.

- [ ] **Step 1: Write the failing test** — `faseDefinida("oitavas")` true quando há partida de oitavas com `mandante_id` e `visitante_id` não nulos; false quando não há / erro de leitura (silencioso). Reusa o mock de `getSupabaseBrowserClient` do teste atual; parametriza a fase.
- [ ] **Step 2: Run, verify FAIL.**
- [ ] **Step 3: Implement** — generaliza a query atual trocando o literal `"trinta-e-dois"` pelo parâmetro `fase`:

```ts
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { FaseMataMata } from "@/scripts-lib"; // ver nota de import abaixo

export async function faseDefinida(fase: FaseMataMata): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("partidas").select("id")
    .eq("fase", fase).not("mandante_id", "is", null).not("visitante_id", "is", null).limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
export const mataMataDefinido = (): Promise<boolean> => faseDefinida("trinta-e-dois");
```

> **Nota de import (FaseMataMata):** o tipo da fase já existe como `FaseCopa` em `@/entities/partida`. Para evitar dependência de `scripts/` a partir de `src/`, **tipar `fase` como `FaseCopa`** (não importar de `scripts/lib`). Ajustar a assinatura para `faseDefinida(fase: FaseCopa)`.

- [ ] **Step 4: Atualizar imports** que usavam `mata-mata-pronto` (`novidades-gate.tsx`). **Step 5: Run, verify PASS. type-check.**

---

### Task 5: Quatro avisos por fase + gate

**Files:**
- Modify: `src/features/novidades/model/aviso-atual.ts`
- Modify: `src/features/novidades/components/novidades-gate.tsx`
- Test: `src/features/novidades/model/aviso-atual.test.ts` (criar se não houver), `src/features/novidades/components/novidades-gate.test.tsx` (estender)

**Interfaces:**
- Consumes: `faseDefinida` de `../api/fase-pronta`.
- Produces: `Gatilho` ampliado; `AVISOS` com 4 novas entradas no fim.

- [ ] **Step 1: Estender o tipo `Gatilho`** em `aviso-atual.ts`:
```ts
export type Gatilho =
  | "mata-mata-definido" | "oitavas-definido" | "quartas-definido"
  | "semifinal-definido" | "final-definido";
```
- [ ] **Step 2: Adicionar os 4 avisos** (PT-BR, copy curta, emoji), preservando os existentes:
```ts
export const AVISO_OITAVAS: Aviso = {
  id: "oitavas-2026", titulo: "Começaram as oitavas!", gatilho: "oitavas-definido",
  itens: [
    { emoji: "✖️", titulo: "Agora vale ×2", descricao: "Cada acerto nas oitavas vale o dobro de pontos. Capricha no palpite." },
    { emoji: "⚔️", titulo: "Confrontos definidos", descricao: "Os classificados das 32-avos já estão chaveados — bola pra frente." },
  ],
};
export const AVISO_QUARTAS: Aviso = {
  id: "quartas-2026", titulo: "Quartas de final!", gatilho: "quartas-definido",
  itens: [
    { emoji: "✖️", titulo: "Segue o ×2", descricao: "As quartas continuam valendo o dobro. Não vacila agora." },
    { emoji: "🏟️", titulo: "Oito viraram quatro", descricao: "Os vencedores das oitavas já estão nos confrontos." },
  ],
};
export const AVISO_SEMI: Aviso = {
  id: "semifinal-2026", titulo: "Semifinal!", gatilho: "semifinal-definido",
  itens: [
    { emoji: "🔥", titulo: "Agora é ×3", descricao: "Semi e final valem o triplo — dá pra virar o bolão na reta final." },
    { emoji: "🎯", titulo: "Quem chega na final?", descricao: "Palpite nas duas semis antes do apito." },
  ],
};
export const AVISO_FINAL: Aviso = {
  id: "final-2026", titulo: "É a final!", gatilho: "final-definido",
  itens: [
    { emoji: "🏆", titulo: "Cravar vale 15", descricao: "A final vale ×3: acertar o placar exato rende 15 pontos." },
    { emoji: "🥉", titulo: "Tem disputa de 3º", descricao: "O jogo do terceiro lugar também conta — não esqueça." },
  ],
};
export const AVISOS: Aviso[] = [
  AVISO_ATUAL, AVISO_MATA_MATA, AVISO_OITAVAS, AVISO_QUARTAS, AVISO_SEMI, AVISO_FINAL,
];
```
- [ ] **Step 3: Mapear gatilhos no gate** (`novidades-gate.tsx`):
```ts
import { faseDefinida } from "../api/fase-pronta";
const VERIFICAR_GATILHO: Record<Gatilho, () => Promise<boolean>> = {
  "mata-mata-definido": () => faseDefinida("trinta-e-dois"),
  "oitavas-definido": () => faseDefinida("oitavas"),
  "quartas-definido": () => faseDefinida("quartas"),
  "semifinal-definido": () => faseDefinida("semifinal"),
  "final-definido": () => faseDefinida("final"),
};
```
- [ ] **Step 4: Testes** — model: cada aviso tem `id`/`titulo`/`itens` não vazios e `gatilho` válido; `AVISOS` sem `id` duplicado; ordem (novidades → mata-mata → oitavas → quartas → semi → final). Gate (estender): com oitavas definidas e usuário que já viu os anteriores, mostra `AVISO_OITAVAS`; um por vez; gatilho não pronto → pula. Mockar `faseDefinida` por fase.
- [ ] **Step 5: Run unit (`pnpm test:run src/features/novidades`), type-check, lint.**

---

### Task 6: Cenário E2E resolve as fases

**Files:**
- Modify: `scripts/scenario-e2e.ts`

- [ ] **Step 1:** Após encerrar as 32-avos no cenário, rodar o núcleo `resolverMataMata` (importado de `scripts/lib/resolver-mata-mata`) em loop até estabilizar (resolve oitavas → encerra → resolve quartas → …), gravando `mandante_id`/`visitante_id` reais e placares, de modo que **cada fase** tenha confrontos de seleções reais e ao menos uma fase fique **aberta** pra palpitar e os modais aparecerem. Reusar o mapeamento `(fase,label)→numero` via `BRACKET_2026`. Idempotente (anti-prod já existe no topo do script).
- [ ] **Step 2:** Rodar `pnpm scenario:seed` no Supabase local e conferir, por SQL, que oitavas/quartas/semi/3º/final têm `mandante_id` não nulo nas partidas esperadas.

---

### Task 7: E2E Playwright com evidências PNG

**Files:**
- Create: `e2e/mata-mata-ate-final/mata-mata-fases.spec.ts`
- Create (output): `e2e/mata-mata-ate-final/evidencias/*.png`

- [ ] **Step 1: Spec** seguindo o padrão E2E existente (login dev, âncoras no topo — ver memória "E2E dev overlays vs bottom-nav"):
  - Para cada fase liberada (oitavas, quartas, semi, final): abrir Palpites, a aba da fase está ativa por padrão com **confrontos de seleções reais** (não rótulos `W74`); **print**. O modal da fase aparece no 1º acesso; **print**; clicar "Bora!"; recarregar; o modal **não** reaparece; **print**.
  - Prova de pontuação ×2: uma oitava encerrada com palpite cravado mostra **10 pts** no histórico/ranking; **print**.
- [ ] **Step 2: Rodar** `pnpm test:e2e e2e/mata-mata-ate-final` (pré: `supabase start` + `pnpm scenario:seed`). Conferir que as PNGs foram geradas em `evidencias/` (não inventar prints).
- [ ] **Step 3:** `qa` agent revisa as evidências; `bug` agent revisa o código de todas as tasks.

---

## Self-Review (preenchido)

- **Cobertura do spec:** Parte 1→Task 1; Parte 2→Task 2; Parte 3→Task 3; Parte 4→Tasks 4–5; Parte 5 (pontuação)→sem código, comprovado em Task 7; Parte 6 (testes)→Tasks 1–2 (unit), 4–5 (unit+integração), 6–7 (E2E). ✔
- **Placeholders:** sem TODO/TBD; código real em cada step. A asserção de "referido uma vez" tem nota de correção (101/102 → 2). ✔
- **Consistência de tipos:** `PartidaResultado`/`ConfrontoResolvido` definidos na Task 2 e consumidos na 3/6; `faseDefinida(fase: FaseCopa)` (Task 4) consumido na 5; `FaseMataMata` interno a `scripts/lib`, UI usa `FaseCopa`. ✔
- **Risco numeração:** Task 1 Step 1 (verificação `back`) + testes estruturais + confirmação humana no CLI (Task 3). ✔
