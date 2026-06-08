# Aba de Premiação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a aba **Premiação** — página informativa que explica que 100% do arrecadado (R$ 10/pessoa) vira prêmio para os 3 primeiros (50/30/20), com o campeão escolhendo camisa oficial ou dinheiro, e o pote calculado ao vivo a partir do número de inscritos.

**Architecture:** Rota estática nova `/premiacao` no App Router, com conteúdo em PT-BR mobile-first. Um item novo na bottom-nav (ícone `Gift`). A divisão do pote é uma função pura testável; a contagem de inscritos reusa o Supabase (degrada para a regra em % se faltar). Feature independente do "palpite dia a dia".

**Tech Stack:** Next.js 16 App Router, React 19, TanStack Query, Supabase, TypeScript, Tailwind 4, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-08-aba-premiacao-design.md`

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/shared/lib/constants.ts` | + `VALOR_INSCRICAO`, `DIVISAO_PREMIO` |
| `src/features/premiacao/lib/calcular-divisao.ts` | **novo** — `dividirPote(pote)` (50/30/20, sem vazar centavos) |
| `src/features/premiacao/api/contagem-inscritos.ts` | **novo** — lê o nº de participantes do bolão |
| `src/features/premiacao/api/queries.ts` | **novo** — `useContagemInscritos()` (TanStack Query) |
| `src/features/premiacao/components/premiacao-content.tsx` | **novo** — conteúdo da página |
| `src/features/premiacao/index.ts` | **novo** — barrel exports |
| `src/app/premiacao/page.tsx` | **nova rota** |
| `src/widgets/app-shell/ui/bottom-nav.tsx` | + item "Premiação" (ícone `Gift`) |

---

## Task 1: Constantes de premiação

**Files:**
- Modify: `src/shared/lib/constants.ts`
- Test: `src/shared/lib/constants.test.ts`

- [ ] **Step 1: Escrever o teste (falha)**

In `src/shared/lib/constants.test.ts`, adicione:

```ts
import { VALOR_INSCRICAO, DIVISAO_PREMIO } from "./constants";

describe("premiação", () => {
  it("inscrição é R$ 10", () => {
    expect(VALOR_INSCRICAO).toBe(10);
  });
  it("a divisão soma 100%", () => {
    const soma = DIVISAO_PREMIO.primeiro + DIVISAO_PREMIO.segundo + DIVISAO_PREMIO.terceiro;
    expect(soma).toBeCloseTo(1);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/shared/lib/constants.test.ts`
Expected: FAIL (constantes inexistentes).

- [ ] **Step 3: Implementar**

In `src/shared/lib/constants.ts`, adicione ao fim:

```ts
/** Valor da inscrição por participante, em reais. 100% revertido em prêmios. */
export const VALOR_INSCRICAO = 10 as const;

/** Divisão do pote entre os 3 primeiros do ranking final. Soma = 1. */
export const DIVISAO_PREMIO = {
  primeiro: 0.5,
  segundo: 0.3,
  terceiro: 0.2,
} as const;
```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/shared/lib/constants.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/constants.ts src/shared/lib/constants.test.ts
git commit -m "add prize config constants"
```

---

## Task 2: `dividirPote` — divisão sem vazar centavos

**Files:**
- Create: `src/features/premiacao/lib/calcular-divisao.ts`
- Test: `src/features/premiacao/lib/calcular-divisao.test.ts`

- [ ] **Step 1: Escrever os testes (falham)**

Create `src/features/premiacao/lib/calcular-divisao.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dividirPote } from "./calcular-divisao";

describe("dividirPote", () => {
  it("divide 1000 em 500/300/200", () => {
    expect(dividirPote(1000)).toEqual({ primeiro: 500, segundo: 300, terceiro: 200 });
  });
  it("a soma das partes é sempre igual ao pote (sem vazar centavos)", () => {
    for (const pote of [1000, 870, 333, 1, 9999]) {
      const d = dividirPote(pote);
      expect(d.primeiro + d.segundo + d.terceiro).toBe(pote);
    }
  });
  it("pote 0 → tudo 0", () => {
    expect(dividirPote(0)).toEqual({ primeiro: 0, segundo: 0, terceiro: 0 });
  });
  it("o 1º nunca recebe menos que o 2º, e o 2º não menos que o 3º", () => {
    const d = dividirPote(871);
    expect(d.primeiro).toBeGreaterThanOrEqual(d.segundo);
    expect(d.segundo).toBeGreaterThanOrEqual(d.terceiro);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/premiacao/lib/calcular-divisao.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar**

Create `src/features/premiacao/lib/calcular-divisao.ts`:

```ts
import { DIVISAO_PREMIO } from "@/shared/lib/constants";

export interface DivisaoPremio {
  primeiro: number;
  segundo: number;
  terceiro: number;
}

/**
 * Divide o pote entre os 3 primeiros segundo DIVISAO_PREMIO. Arredonda 2º e 3º
 * para baixo (inteiros) e dá o restante ao 1º, garantindo que a soma das partes
 * seja exatamente igual ao pote (nenhum centavo vaza ou some).
 */
export function dividirPote(pote: number): DivisaoPremio {
  const segundo = Math.floor(pote * DIVISAO_PREMIO.segundo);
  const terceiro = Math.floor(pote * DIVISAO_PREMIO.terceiro);
  const primeiro = pote - segundo - terceiro;
  return { primeiro, segundo, terceiro };
}
```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/premiacao/lib/calcular-divisao.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/premiacao/lib/calcular-divisao.ts src/features/premiacao/lib/calcular-divisao.test.ts
git commit -m "add prize pool division helper"
```

---

## Task 3: Contagem de inscritos (Supabase) + query

**Files:**
- Create: `src/features/premiacao/api/contagem-inscritos.ts`
- Create: `src/features/premiacao/api/queries.ts`
- Test: `src/features/premiacao/api/contagem-inscritos.test.ts`

- [ ] **Step 1: Escrever o teste do fetcher (falha)**

Create `src/features/premiacao/api/contagem-inscritos.test.ts` no padrão de mock do Supabase usado em `src/features/ranking/api/*-fetcher.test.ts` (mock de `getSupabaseBrowserClient`). Cobertura:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/supabase", () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { contarInscritos } from "./contagem-inscritos";

function mockCount(count: number | null, error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ count, error });
  const select = vi.fn().mockReturnValue({ eq });
  (getSupabaseBrowserClient as unknown as vi.Mock).mockReturnValue({
    from: vi.fn().mockReturnValue({ select }),
  });
}

describe("contarInscritos", () => {
  it("retorna a contagem de participantes do bolão", async () => {
    mockCount(87);
    expect(await contarInscritos()).toBe(87);
  });
  it("retorna 0 quando count é null", async () => {
    mockCount(null);
    expect(await contarInscritos()).toBe(0);
  });
  it("lança em caso de erro", async () => {
    mockCount(null, { message: "boom" });
    await expect(contarInscritos()).rejects.toThrow(/boom/);
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/premiacao/api/contagem-inscritos.test.ts`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar o fetcher**

Create `src/features/premiacao/api/contagem-inscritos.ts`:

```ts
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { BOLAO_PADRAO_ID } from "@/shared/lib/constants";

/**
 * Conta os participantes do bolão padrão. Usa `head: true` + `count: 'exact'`
 * para não trafegar linhas — só o número. RLS de leitura de participantes já
 * libera para authenticated.
 */
export async function contarInscritos(): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  const { count, error } = await supabase
    .from("participantes")
    .select("id", { count: "exact", head: true })
    .eq("bolao_id", BOLAO_PADRAO_ID);

  if (error) {
    throw new Error(`Falha ao contar inscritos: ${error.message}`);
  }
  return count ?? 0;
}
```

(Nota: o teste mocka `.select().eq()` resolvendo `{ count }`; a opção `{ count, head }` do segundo argumento de `select` não altera o encadeamento mockado.)

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/premiacao/api/contagem-inscritos.test.ts`
Expected: PASS.

- [ ] **Step 5: Criar a query**

Create `src/features/premiacao/api/queries.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { contarInscritos } from "./contagem-inscritos";

export const premiacaoKeys = {
  inscritos: ["premiacao", "inscritos"] as const,
};

export function useContagemInscritos() {
  return useQuery({
    queryKey: premiacaoKeys.inscritos,
    queryFn: () => contarInscritos(),
    // Número de inscritos muda devagar; 10 min evita refetch a cada visita.
    staleTime: 10 * 60 * 1000,
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/features/premiacao/api/
git commit -m "add inscritos count query for premiacao"
```

---

## Task 4: `PremiacaoContent` — a página

**Files:**
- Create: `src/features/premiacao/components/premiacao-content.tsx`
- Create: `src/features/premiacao/index.ts`
- Test: `src/features/premiacao/components/premiacao-content.test.tsx`

- [ ] **Step 1: Escrever os testes (falham)**

Create `src/features/premiacao/components/premiacao-content.test.tsx` (mocke `../api/queries`):

```ts
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../api/queries", () => ({ useContagemInscritos: vi.fn() }));
import { useContagemInscritos } from "../api/queries";
import { PremiacaoContent } from "./premiacao-content";

const mock = useContagemInscritos as unknown as vi.Mock;

describe("PremiacaoContent", () => {
  it("mostra a regra de divisão 50/30/20 e a inscrição", () => {
    mock.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    render(<PremiacaoContent />);
    expect(screen.getByText(/R\$\s*10/)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.getByText(/30%/)).toBeInTheDocument();
    expect(screen.getByText(/20%/)).toBeInTheDocument();
  });

  it("mostra o card do campeão (camisa OU dinheiro)", () => {
    mock.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    render(<PremiacaoContent />);
    expect(screen.getByText(/camisa oficial/i)).toBeInTheDocument();
  });

  it("com contagem, mostra o pote e os valores por colocação", () => {
    mock.mockReturnValue({ data: 87, isLoading: false, isError: false });
    render(<PremiacaoContent />);
    expect(screen.getByText(/87/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*870/)).toBeInTheDocument(); // pote
    expect(screen.getByText(/R\$\s*435/)).toBeInTheDocument(); // 1º = 50% de 870
  });

  it("sem contagem, degrada para a regra em % sem quebrar", () => {
    mock.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<PremiacaoContent />);
    expect(screen.getByText(/50%/)).toBeInTheDocument();
    expect(screen.queryByText(/Pote atual/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/features/premiacao/components/premiacao-content.test.tsx`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implementar a página**

Create `src/features/premiacao/components/premiacao-content.tsx`:

```tsx
"use client";

import { Trophy, Shirt } from "lucide-react";
import { VALOR_INSCRICAO, DIVISAO_PREMIO } from "@/shared/lib/constants";
import { dividirPote } from "../lib/calcular-divisao";
import { useContagemInscritos } from "../api/queries";

const reais = (valor: number): string =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const PODIO = [
  { pos: "1º", medalha: "🥇", pct: DIVISAO_PREMIO.primeiro, chave: "primeiro" as const },
  { pos: "2º", medalha: "🥈", pct: DIVISAO_PREMIO.segundo, chave: "segundo" as const },
  { pos: "3º", medalha: "🥉", pct: DIVISAO_PREMIO.terceiro, chave: "terceiro" as const },
];

export function PremiacaoContent() {
  const { data: inscritos, isError } = useContagemInscritos();
  const temContagem = typeof inscritos === "number" && !isError;
  const pote = temContagem ? inscritos * VALOR_INSCRICAO : null;
  const divisao = pote !== null ? dividirPote(pote) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/20 text-gold-500" aria-hidden="true">
          <Trophy className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground">Premiação</h1>
        <p className="text-sm text-muted-foreground">
          Inscrição de {reais(VALOR_INSCRICAO)} · <span className="font-semibold">100% vira prêmio</span>
        </p>
      </header>

      {temContagem && pote !== null && (
        <section aria-labelledby="pote" className="rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-center">
          <h2 id="pote" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pote atual</h2>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-bold">{inscritos}</span> inscritos × {reais(VALOR_INSCRICAO)} ={" "}
            <span className="font-display text-xl font-bold text-brand-800">{reais(pote)}</span>
          </p>
        </section>
      )}

      <section aria-labelledby="divisao">
        <h2 id="divisao" className="mb-3 font-display text-base font-bold text-foreground">Como é dividido</h2>
        <div className="grid grid-cols-3 gap-2">
          {PODIO.map((p) => (
            <div key={p.pos} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
              <span className="text-2xl" aria-hidden="true">{p.medalha}</span>
              <span className="text-sm font-semibold text-foreground">{p.pos} lugar</span>
              <span className="font-mono text-lg font-bold text-brand-800">{Math.round(p.pct * 100)}%</span>
              {divisao && (
                <span className="font-mono text-xs font-semibold text-muted-foreground">{reais(divisao[p.chave])}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="campeao" className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <h2 id="campeao" className="flex items-center gap-2 text-sm font-semibold text-brand-800">
          <Shirt className="h-4 w-4 shrink-0" aria-hidden="true" />
          O campeão escolhe
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-brand-700">
          O 1º lugar pode levar uma <span className="font-semibold">camisa oficial</span> da seleção que
          quiser <span className="font-semibold">mais a diferença em dinheiro</span>, ou receber todo o
          prêmio em dinheiro. 2º e 3º recebem em dinheiro.
        </p>
      </section>

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold">Pagamento após a final</span> (19/jul/2026). O critério de
          desempate é o mesmo do ranking. Todo o dinheiro arrecadado é distribuído — a organização não
          retém nada.
        </p>
      </div>
    </div>
  );
}
```

Create `src/features/premiacao/index.ts`:

```ts
export { PremiacaoContent } from "./components/premiacao-content";
```

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/features/premiacao/components/premiacao-content.test.tsx`
Expected: PASS. (Se `Math.round(0.3*100)` etc. exibir algo inesperado, confira: 50/30/20 são exatos.)

- [ ] **Step 5: Commit**

```bash
git add src/features/premiacao/components/ src/features/premiacao/index.ts
git commit -m "add premiacao page content"
```

---

## Task 5: Rota `/premiacao`

**Files:**
- Create: `src/app/premiacao/page.tsx`

- [ ] **Step 1: Criar a rota**

Create `src/app/premiacao/page.tsx` (segue o padrão de `src/app/regras/page.tsx`, que é um Server Component renderizando o conteúdo):

```tsx
import { PremiacaoContent } from "@/features/premiacao";

export default function PremiacaoPage() {
  return <PremiacaoContent />;
}
```

- [ ] **Step 2: Verificar build/type-check**

Run: `pnpm type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/premiacao/page.tsx
git commit -m "add premiacao route"
```

---

## Task 6: Item na bottom-nav

**Files:**
- Modify: `src/widgets/app-shell/ui/bottom-nav.tsx`
- Test: `src/widgets/app-shell/ui/bottom-nav.test.tsx`

- [ ] **Step 1: Escrever o teste (falha)**

In `src/widgets/app-shell/ui/bottom-nav.test.tsx`, adicione:

```ts
it("mostra o item Premiação apontando para /premiacao", () => {
  // render do BottomNav no padrão já usado no arquivo (mock de usePathname/useIsAdmin)
  expect(screen.getByRole("link", { name: /premiação/i })).toHaveAttribute("href", "/premiacao");
});
```

- [ ] **Step 2: Rodar — falha**

Run: `pnpm test:run src/widgets/app-shell/ui/bottom-nav.test.tsx`
Expected: FAIL (item inexistente).

- [ ] **Step 3: Implementar**

In `src/widgets/app-shell/ui/bottom-nav.tsx`:
- No import de ícones, adicione `Gift`: `import { LayoutDashboard, Target, Trophy, Gift, BookOpen, ShieldCheck } from "lucide-react";`
- Em `BASE_NAV_ITEMS`, adicione o item antes de "Regras" (Premiação fica entre Ranking e Regras):

```ts
  { href: "/premiacao", label: "Premiação", icon: Gift },
```

(Use `Gift`, não `Trophy` — `Trophy` já é o ícone do Ranking.)

- [ ] **Step 4: Rodar — passa**

Run: `pnpm test:run src/widgets/app-shell/ui/bottom-nav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/widgets/app-shell/ui/bottom-nav.tsx src/widgets/app-shell/ui/bottom-nav.test.tsx
git commit -m "add premiacao item to bottom nav"
```

---

## Task 7: E2E (Playwright)

**Files:**
- Create: `tests/e2e/premiacao.spec.ts`

- [ ] **Step 1: Escrever o teste E2E**

Create `tests/e2e/premiacao.spec.ts` (padrão de login demo dos outros specs):

```ts
import { test, expect } from "@playwright/test";

test.describe("premiação", () => {
  test("navega pela bottom-nav e mostra a divisão 50/30/20", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /premiação/i }).click();
    await expect(page).toHaveURL(/\/premiacao/);
    await expect(page.getByRole("heading", { name: /premiação/i })).toBeVisible();
    await expect(page.getByText(/50%/)).toBeVisible();
    await expect(page.getByText(/camisa oficial/i)).toBeVisible();
  });
});
```

- [ ] **Step 2: Rodar o E2E**

Run: `pnpm test:e2e tests/e2e/premiacao.spec.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/premiacao.spec.ts
git commit -m "add e2e for premiacao tab"
```

---

## Task 8: Validação final

- [ ] **Step 1: Validar tudo**

Run: `pnpm validate`
Expected: type-check + lint + format + unit — verdes.

- [ ] **Step 2: Cobertura dos módulos novos**

Run: `pnpm test:coverage`
Expected: `calcular-divisao.ts`, `contagem-inscritos.ts`, `premiacao-content.tsx` ~100% de linhas.

- [ ] **Step 3: Conferir a navegação em mobile (manual/E2E)**

Verifique em 375px que a bottom-nav com 5 itens (6 para admin) não estoura. Se ficar apertado para admin, encurte o label para "Prêmio" — decisão de ajuste fino, não bloqueia.

---

## Self-review checklist (autor do plano)

- Spec coverage: inscrição R$10 + 100% prêmio (T1, T4) ✓ · divisão 50/30/20 (T1, T2, T4) ✓ · campeão camisa-ou-dinheiro (T4) ✓ · pote ao vivo + degradação (T3, T4) ✓ · aba própria (T5, T6) ✓ · testes unit/componente/E2E (T2, T4, T6, T7) ✓.
- Sem placeholders nas etapas de código novo (constantes, `dividirPote`, fetcher, query, página, rota têm código completo). Etapas de teste descrevem o ajuste exato no arquivo real (mocks no padrão existente).
- Consistência de tipos: `DivisaoPremio` ({primeiro,segundo,terceiro}) usado igual em T2/T4; `DIVISAO_PREMIO` com as mesmas chaves; `VALOR_INSCRICAO = 10` reusado em T2/T3/T4.
- YAGNI respeitado: sem pagamento online, sem status de quem pagou, sem escolha de camisa no app (seção 6 do spec).
