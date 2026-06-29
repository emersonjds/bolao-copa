# Chaveamento (bracket) + auto-avanço do mata-mata — Design

> Data: 2026-06-29 · Status: aprovado para plano

## Contexto

Pedido do usuário: (1) ao marcar o resultado de um jogo do mata-mata, a próxima fase já
deve ser **chaveada automaticamente** (sem rodar comando); (2) uma **tela de chaveamento**
(estilo pôster "Round of 32", adaptada ao tema do app) que mostra o caminho até a final e
se atualiza conforme os resultados entram; (3) um **modal de novidade** anunciando a tela,
com botão "Bora!" que o usuário clica pra confirmar que viu.

Já existe (entregue nesta branch): topologia oficial `scripts/lib/bracket-2026.ts`
(jogos 73–104), resolver puro `resolverMataMata`, CLI `pnpm mata-mata` (backfill manual),
e a fila de avisos (`AVISOS` + `ModalNovidades` + `avisos_vistos`). Pontuação por fase
(`peso_fase`, ×1/×2/×3) já automática. Os rótulos das partidas do mata-mata no banco já
codificam a topologia: `W{n}` = vencedor do jogo n, `L{n}` = perdedor do jogo n.

## Decisões (travadas com o usuário)

- **Auto-avanço = trigger no Postgres** (server-side, fonte de verdade, igual `apurar_pontos`).
- **Visual = adaptado ao design system** do app (tema claro, `brand-*` verde, dourado
  `accent`, escudos via `FlagIcon`). Não replicar o fundo escuro do pôster.
- **Mobile = bracket completo** num container com **scroll** (horizontal + vertical) e
  **zoom por botões** (−/+). Pinch é comportamento nativo da página; não implementamos
  gesto custom (mais simples e acessível).

## Objetivos

1. Trigger que preenche `mandante_id`/`visitante_id` da próxima partida assim que um jogo
   do mata-mata encerra.
2. Tela de chaveamento lendo o estado persistido, com placeholders ("Vencedor 74") nos
   confrontos ainda não definidos, atualizando conforme os resultados entram.
3. Modal de novidade da tela (1×, confirmado).
4. Cobertura SDD: unit + integração (MSW) + E2E com evidência PNG.

## Não-objetivos

- Não mudar `peso_fase()`/`apurar_pontos()`.
- Não recriar a resolução em TS na tela — a tela é **leitora** do estado que a trigger grava.
- Não adicionar 6º item fixo na bottom-nav (fica apertado no mobile); a tela é alcançada
  pela aba **Copa** (segmento "Chaveamento") + deep-link `/chaveamento` (do modal).

## Parte 1 — Coluna `numero` + trigger de auto-avanço

### 1.1 Migration `0029_mata_mata_auto_avanco.sql`

- `alter table public.partidas add column numero smallint;` (nullable — grupos ficam null).
- **Backfill** dos 32 jogos do mata-mata (73–104) via `update ... from (values ...) ` casando
  por `(fase, mandante_label, visitante_label)`. Os 32 pares (fase,label,label,numero) saem
  de `BRACKET_2026` (gerados pelo agent a partir do módulo — determinístico).
- `create unique index on partidas (numero) where numero is not null;` (cada número 1×).
- **Trigger `avancar_mata_mata()`** (`after update on partidas`, `security definer`,
  `search_path = public, pg_temp`), dispara quando `NEW.status='encerrada'`,
  `NEW.numero is not null`, gols não nulos:
  - `venc` = mandante se `gols_mandante > gols_visitante`; visitante se menor; senão
    `vencedor_penaltis`. `perd` = o outro lado. Se `venc` null (sem pênaltis num empate),
    não faz nada (espera correção).
  - `update partidas set mandante_id = venc where mandante_label = 'W'||NEW.numero;`
    e o análogo para `visitante_label='W'||NEW.numero`, e `'L'||NEW.numero` → `perd`.
    Grava o lado da próxima partida (sobrescreve, pra correção propagar 1 nível).
  - **Sem recursão**: marcar `mandante_id` numa partida `agendada` re-dispara a trigger, mas
    `NEW.status<>'encerrada'` → no-op. Convive com `apurar_pontos` (triggers separadas).
- **Idempotente/seguro**: re-encerrar com o mesmo placar grava o mesmo id. Correção que troca
  o vencedor atualiza a próxima partida (palpites na próxima podem ficar órfãos — aceitável
  na fase de validação; documentado).

### 1.2 Seed
`supabase/seed.sql`: incluir `numero` nos 32 inserts do mata-mata (73–104) para que
`supabase db reset` já traga a coluna preenchida (a migration roda **antes** do seed, então o
backfill da migration cobre bancos já populados; o seed cobre resets limpos). Demais fases
(grupos) `numero` null.

> **Segurança/RLS**: a trigger é `security definer` (igual `apurar_pontos`) — escreve em
> `partidas` independncia do RLS do usuário que marcou o resultado. Sem novo GRANT.

## Parte 2 — Derivação do bracket (`src/features/chaveamento/lib/derivar-bracket.ts`)

Função pura, testável, sem I/O:

```ts
export interface LadoConfronto {
  selecao: Selecao | null;     // null se ainda não resolvido
  placeholder: string;          // "Vencedor 74" | "Perdedor 101" | "1A" (rótulo de grupo)
  gols: number | null;
  vencedor: boolean;            // true se este lado venceu (destaque)
}
export interface ConfrontoBracket {
  numero: number; fase: FaseCopa;
  mandante: LadoConfronto; visitante: LadoConfronto;
  status: StatusPartida;
}
export interface RodadaBracket { fase: FaseCopa; titulo: string; confrontos: ConfrontoBracket[]; }
export function derivarBracket(partidas: Partida[]): RodadaBracket[];
```

- Ordena por `numero`; agrupa por fase na ordem trinta-e-dois → oitavas → quartas →
  semifinal → terceiro-lugar → final.
- `placeholder`: se o lado tem seleção, mostra ela; senão traduz o label — `W{n}`→
  "Vencedor {n}", `L{n}`→"Perdedor {n}", rótulo de grupo (`1A`,`2B`,`3X/Y`) mantém o texto.
- `vencedor`: só quando `status='encerrada'` — lado com mais gols, ou `vencedor_penaltis`
  no empate. (Reusa a mesma regra do resolver; pode importar de `scripts/lib`? NÃO — manter
  a regra no front; é 3 linhas. Duplicação consciente, testada dos dois lados.)

## Parte 3 — Fetch (`src/features/chaveamento/api/bracket-fetcher.ts`)

`buscarPartidasMataMata(): Promise<Partida[]>` — Supabase: `partidas` onde
`fase in (trinta-e-dois,oitavas,quartas,semifinal,terceiro-lugar,final)` com join nas
seleções (mesmo shape de `partidas-fetcher.ts`). Integração testada com MSW.

## Parte 4 — Tela (`src/features/chaveamento/components/*` + rota)

- `chaveamento-content.tsx`: container `overflow-auto` com o bracket inteiro; controles de
  zoom (−/+) que aplicam `transform: scale()` num wrapper; estado de zoom em `useState`.
- `coluna-fase.tsx` / `card-confronto.tsx`: cada confronto = dois `LadoConfronto` com
  `FlagIcon` (ou círculo cinza + placeholder quando `selecao=null`), placar quando encerrado,
  destaque verde no vencedor. Linhas conectoras entre colunas via borda CSS (sem lib).
- Tema claro, `brand-*`/`accent`, mobile-first; legível em telas pequenas via scroll.
- Rota `src/app/chaveamento/page.tsx` (client) renderiza o widget; React Query pra cache.
- **Navegação**: segmento "Chaveamento" no topo da aba **Copa** (`/calendario`) apontando pra
  `/chaveamento` (ou um sub-tab). Sem novo item fixo na bottom-nav. (pixel decide o detalhe
  visual do acesso; sem estourar o nav.)

## Parte 5 — Modal de novidade

Novo aviso na fila `AVISOS` (reusa tudo):
```ts
export const AVISO_CHAVEAMENTO: Aviso = {
  id: "chaveamento-2026", titulo: "Veja o chaveamento!", gatilho: "mata-mata-definido",
  itens: [
    { emoji: "🗺️", titulo: "O caminho até a final", descricao: "Agora dá pra ver todo o chaveamento do mata-mata numa tela só, na aba Copa." },
    { emoji: "⚡", titulo: "Atualiza sozinho", descricao: "Conforme os jogos terminam, os próximos confrontos já aparecem chaveados." },
  ],
};
```
Entra em `AVISOS` após os avisos de fase. Gatilho `mata-mata-definido` (só aparece quando há
chaveamento pra ver). Confirmado com "Bora!" (botão já existe no ModalNovidades).

## Parte 6 — Pontuação

Nada a fazer (já automática via `peso_fase`). A tela mostra placares; o destaque de vencedor
usa só gols/pênaltis, sem recalcular pontos.

## Parte 7 — Testes (SDD, 3 camadas)

1. **Unit (Vitest)**
   - `derivar-bracket`: ordem das rodadas; placeholders (`W74`→"Vencedor 74", grupo mantém);
     seleção resolvida aparece; destaque de vencedor (placar e pênaltis); status.
   - **Trigger** (test:db, contra Postgres local): encerrar jogo 74 com placar grava o
     vencedor no lado `W74` da partida 89; empate usa `vencedor_penaltis`; perdedor das semis
     vai pro 3º lugar; re-encerrar é idempotente; cadeia completa 32-avos→final.
2. **Integração (MSW)**: `bracket-fetcher` monta `Partida[]` do payload do Supabase.
3. **E2E (Playwright) com evidência PNG** em `e2e/chaveamento/evidencias/*.png`:
   - Abrir a tela de chaveamento: rodadas renderizam com seleções reais + placeholders nas
     fases futuras; **print** (scroll/zoom funcionam).
   - Auto-avanço: estado com uma fase recém-encerrada mostra a próxima já chaveada; **print**.
   - Modal "Veja o chaveamento!" aparece no 1º acesso, fecha em "Bora!", não reaparece após
     reload; **print**.
   - Pré-requisito: cenário E2E (já encerra todas as fases) — a trigger preenche as próximas
     ao encerrar; conferir que o chaveamento tem seleções reais.

## Arquivos afetados (estimativa)

- Novo: `supabase/migrations/0029_mata_mata_auto_avanco.sql`; editar `supabase/seed.sql`.
- Novo: `src/features/chaveamento/{lib/derivar-bracket,api/bracket-fetcher,components/*}`
  (+ testes), `src/features/chaveamento/index.ts`.
- Novo: `src/app/chaveamento/page.tsx`; editar acesso na aba Copa.
- Editar: `src/features/novidades/model/aviso-atual.ts` (AVISO_CHAVEAMENTO).
- Editar: `scripts/scenario-e2e.ts` (confiar na trigger; deixar fase aberta).
- Novo: `e2e/chaveamento/*.spec.ts` + evidências PNG; teste de trigger em `*.db.test`.
- Doc: este spec + `plan.md`.

## Riscos & mitigações

- **Trigger grava errado** → topologia vem dos rótulos já no banco + `numero` (índice único);
  teste test:db da cadeia completa; `security definer` espelha `apurar_pontos`. Aplicar em
  prod é `supabase db push` rodado pelo humano.
- **Correção de resultado** deixa palpite órfão na próxima → aceitável na validação;
  documentado; a trigger propaga 1 nível ao re-encerrar.
- **Bracket largo no mobile** → scroll + zoom por botões; fase a fase continua acessível pela
  estrutura (colunas roláveis).
- **Duplicação da regra de vencedor** (SQL trigger + TS derivar-bracket) → 3 linhas, testadas
  independentemente nos dois lados; topologia NÃO duplicada (vem dos dados).
