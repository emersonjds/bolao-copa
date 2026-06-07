# Performance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development / dispatching-parallel-agents. Steps use `- [ ]`.

**Goal:** Deixar o app rápido aplicando os achados do `docs/audits/performance-audit.md`, sem alterar comportamento visível (UI PT-BR) nem o banco.

**Architecture:** SPA Next 16 static export + Supabase direto + TanStack Query. Mudanças são localizadas; 3 tarefas tocam arquivos DISJUNTOS (paralelizáveis), 1 é trivial inline.

**Tech Stack:** Next 16, React 19, TanStack Query, Tailwind.

**Regras:** UI continua PT-BR; banco intacto; cada tarefa valida `pnpm type-check` + `pnpm lint` + `pnpm test:run` verdes e commita. Mensagens em inglês, sem rodapé de IA.

---

## Task 1 — Home renderiza só os próximos ~5 jogos (104→5)

**Files:**
- Modify: `src/features/partidas/components/proximos-jogos.tsx`
- Test: `src/features/partidas/components/proximos-jogos.test.tsx`

Hoje o componente faz `partidas.map(...)` em TODAS as 104 partidas → ~208 requests a flagcdn na home. "Próximos jogos" deve mostrar só os jogos que ainda não terminaram, os 5 mais próximos.

- [ ] **Step 1:** No componente, antes do `return` da lista, derivar:
```tsx
const NUM_PROXIMOS = 5;
const proximos = partidas
  .filter((partida) => partida.status !== "encerrada")
  .slice(0, NUM_PROXIMOS);
```
e mapear `proximos` em vez de `partidas`. Se `proximos.length === 0`, manter a mensagem de vazio existente ("Nenhum jogo por aqui ainda."). (As partidas já vêm ordenadas por data asc do fetcher.)
- [ ] **Step 2:** Atualizar o teste: o caso "exibe placar e status 'Encerrado'..." não se aplica mais (encerradas são filtradas). Trocar por um teste que prova o filtro+limite:
```tsx
it("mostra só os próximos jogos não encerrados, no máximo 5", () => {
  mockUsePartidas({
    data: [
      makePartida({ id: "a", status: "encerrada", golsMandante: 2, golsVisitante: 1 }),
      ...Array.from({ length: 6 }, (_, index) =>
        makePartida({ id: `up-${index}`, status: "agendada" }),
      ),
    ],
  });
  render(<ProximosJogos />);
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  expect(screen.queryByText("2 : 1")).not.toBeInTheDocument();
});
```
Manter os demais casos (loading, erro, vazio, "Fazer palpite" em agendada, "Ao vivo").
- [ ] **Step 3:** `pnpm type-check && pnpm lint && pnpm test:run` verdes.
- [ ] **Step 4:** Commit: `limit home to next five upcoming matches`.

---

## Task 2 — Identidade de auth sem round-trip (destrava o waterfall)

**Files:**
- Modify: `src/shared/lib/supabase/use-user.ts`
- Test: `src/shared/lib/supabase/use-user.test.ts` (criar se não existir; senão ajustar o existente)

`useSupabaseUser` usa `supabase.auth.getUser()` (chamada de REDE que valida o token no servidor) no carregamento. Para identidade de UI num SPA protegido por RLS, `getSession()` (lê local, sem rede) basta e elimina ~100-300ms que hoje precedem a query de participante e a de palpites.

- [ ] **Step 1:** Trocar o carregamento inicial de `getUser()` por `getSession()`:
```ts
supabase.auth
  .getSession()
  .then(({ data }) => setUser(data.session?.user ?? null))
  .catch(() => setUser(null));
```
Manter o `onAuthStateChange` como está. Atualizar o comentário do bloco (sem "getUser").
- [ ] **Step 2:** Garantir/ajustar teste do hook: mockar `getSession` retornando uma sessão com user e afirmar que o hook expõe esse user; e que `onAuthStateChange` atualiza em login/logout. (Seguir o padrão de mock de `getSupabaseBrowserClient` já usado nos testes de supabase em `src/shared/lib/supabase/*.test.ts`.)
- [ ] **Step 3:** `pnpm type-check && pnpm lint && pnpm test:run` verdes.
- [ ] **Step 4:** Commit: `use local session for user identity to cut auth round-trip`.

---

## Task 3 — Paginação progressiva do histórico

**Files:**
- Modify: `src/features/palpites/components/historico-content.tsx`
- Test: `src/features/palpites/components/historico-content.test.tsx`

No fim da Copa o histórico monta 100+ `CardHistorico` de uma vez. Mostrar os primeiros N (ex.: 20) e um botão "Ver mais" que aumenta o limite — sem dependência nova (sem lib de virtualização).

- [ ] **Step 1:** Adicionar estado `const [limite, setLimite] = useState(20);` e, ao montar a lista agrupada por dia, considerar só os primeiros `limite` itens do total (cortar a lista achatada antes de agrupar por dia). Abaixo da lista, se houver mais itens que `limite`, renderizar um `<button>` "Ver mais jogos" que faz `setLimite((atual) => atual + 20)`. Botão segue o estilo outline já usado no projeto e é PT-BR.
- [ ] **Step 2:** Teste: dado 25 itens de histórico, renderiza 20 cards e o botão "Ver mais jogos"; após click, renderiza os 25 e o botão some. Mockar os dados como os testes atuais de `historico-content.test.tsx` já fazem.
- [ ] **Step 3:** `pnpm type-check && pnpm lint && pnpm test:run` verdes.
- [ ] **Step 4:** Commit: `paginate match history to render fewer cards upfront`.

---

## Task 4 — Cache HTTP do HTML + escopo da fonte mono (INLINE, trivial)

**Files:**
- Modify: `public/_headers`

- [ ] **Step 1:** Adicionar regra de cache curto+revalidação para os HTMLs (assets com hash já são imutáveis):
```
/*.html
  Cache-Control: public, max-age=300, stale-while-revalidate=86400
```
- [ ] **Step 2:** `pnpm build` e confirmar que `out/_headers` contém a regra.
- [ ] **Step 3:** Commit: `cache html with short max-age and swr`.

---

## Validação final (após integrar todas)

- [ ] `pnpm type-check` + `pnpm lint` + `pnpm test:run` (409+) verdes
- [ ] `pnpm build` ok
- [ ] e2e (72) + banco (19) com Supabase local + `pnpm scenario:seed`
- [ ] Re-medir bundle/LCP no `docs/audits/performance-audit.md` para comprovar ganho

## Fora de escopo (registrado, não nesta leva)
- Unificar a dupla assinatura de auth (AuthProvider + useSupabaseUser) — exige rever fronteira FSD; baixo ganho extra após Task 2.
- Virtualização real (TanStack Virtual) — paginação da Task 3 já resolve o essencial.
</content>
