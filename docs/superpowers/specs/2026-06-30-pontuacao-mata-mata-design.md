# Pontuação do mata-mata — "quem avança"

**Data:** 2026-06-30
**Status:** design aprovado (modelo travado com o dono) — pendente revisão da spec escrita

## 1. Problema

No mata-mata não existe empate como resultado final: alguém sempre avança (no tempo
normal, na prorrogação ou nos pênaltis). As pessoas não palpitam empate — palpitam que
um time passa. Com a regra atual (base `5/4/3/2/0` sobre o placar do tempo normal, com
pênaltis sem valor), a maioria dos palpites de eliminatória zera, porque o que importa
de verdade — **quem passa** — não pontua. O bolão precisa continuar dando pontos até a
final.

## 2. Regra nova (somente mata-mata)

Vale **quem avança**. O placar do tempo normal entra como bônus de precisão. A
pontuação é **travada em quem avança**: errou o time que passa, zera.

| O que aconteceu | O que você palpitou | Base |
|---|---|---|
| Time X avançou | cravou o placar de uma **vitória** e apontou X | **5** |
| Time X avançou | cravou o placar de **empate** (90') e apontou X na decisão | **4** |
| Time X avançou | apontou X (placar do 90' errado) | **3** |
| Time X avançou | apontou o outro time | **0** |

**Trava anti-empate (decisão de design):** o empate cravado vale **4 < 5** (vitória
cravada). Apostar empate nunca rende mais que cravar uma vitória, então não existe
incentivo de gamear "chutar 0×0 + favorito". E **errar quem passa zera mesmo cravando o
empate** — sem consolação, sem brecha. A regra fica idêntica à dos grupos de ler: cravou
vitória 5, cravou empate 4, acertou quem passa 3, errou 0.

- **× peso da fase** (igual hoje): grupos/32-avos/3º lugar `×1`; oitavas/quartas `×2`;
  semi/final `×3`. Ex.: cravar uma decisão na final = `5×3 = 15`.
- **Grupos ficam inalterados** (`5/4/3/2/0`) — lá empate é resultado real.
- **Quem avança de verdade** = quem venceu no tempo normal; se o 90' empatou, é
  `vencedor_penaltis` (campo já existente, que cobre prorrogação **e** pênaltis).
- **Quem avança no palpite**:
  - palpitou um vencedor (ex.: `Brasil 2×1`) → avança = o time que ele deu como
    vencedor. **Derivado, sem campo novo na tela pra esse caso.**
  - palpitou empate (ex.: `1×1`) → ele **escolhe** quem passa (novo campo
    `vencedor_avanca`). **Obrigatório** quando o palpite é empate em jogo de mata-mata.

### Exemplos (confirmados com o dono)

- Palpite `Brasil 2×1`, real `Brasil 2×1` (90') → **5** (cravou vitória + quem passa)
- Palpite `Brasil 2×1`, real `Brasil 1×0` (90') → **3** (acertou quem passa)
- Palpite `Brasil 2×1`, real `0×0` + Brasil nos pênaltis → **3** (errou o 90', mas Brasil passou)
- Palpite `1×1`, escolheu Brasil, real `0×0` + Brasil pênaltis → **3** (quem passa, placar errado)
- Palpite `1×1`, escolheu Brasil, real `1×1` + Brasil pênaltis → **4** (cravou o empate **e** quem passa)
- Palpite `1×1`, escolheu Brasil, real `1×1` + **outro** time nos pênaltis → **0** (errou quem passa, mesmo cravando o 90')
- Apontou o time errado → **0**

> **3º lugar:** trata como qualquer jogo de mata-mata (`fase != grupos`). "Quem avança"
> vira "quem vence". O rótulo do seletor na tela muda para "Quem vence?" nessa fase.

## 3. Modelo de dados

### `palpites` — nova coluna

```sql
alter table public.palpites
  add column vencedor_avanca uuid references public.selecoes (id);
```

- Nullable. Só preenchido quando o palpite é empate em jogo de mata-mata.
- Integridade: além da FK, um trigger `before insert/update` valida que, quando
  preenchido, `vencedor_avanca` é `mandante_id` **ou** `visitante_id` da partida do
  palpite (espelha a validação de `vencedor_penaltis` no auto-avanço). Palpite de grupos
  ou com vencedor no placar deve ter `vencedor_avanca` nulo.
- A trava de horário (`trg_palpite_lock`) já cobre a nova coluna: depois do apito não dá
  pra alterar o palpite (inclui o seletor).

### Entidade `Palpite` (front)

`src/entities/palpite/model/palpite.ts`: adicionar `vencedorAvanca: string | null`.
DTO (`palpites-fetcher.ts`): mapear `vencedor_avanca` ⇄ `vencedorAvanca`.

## 4. `apurar_pontos()` — lógica nova

Mesma assinatura/trigger (`trg_apurar_pontos`). Passa a ramificar por fase:

- **`fase = 'grupos'`** → corpo atual inalterado (`5/4/3/2/0 × 1`).
- **mata-mata** (`fase != 'grupos'`):

```text
real_avanca :=
  gols_mandante > gols_visitante → mandante_id
  gols_visitante > gols_mandante → visitante_id
  senão                          → vencedor_penaltis

para cada palpite da partida:
  pal_avanca :=
    pal.gols_mandante > pal.gols_visitante → new.mandante_id
    pal.gols_visitante > pal.gols_mandante → new.visitante_id
    senão                                  → pal.vencedor_avanca
  cravou      := (pal.gols_mandante = new.gols_mandante and pal.gols_visitante = new.gols_visitante)
  empate_real := (new.gols_mandante = new.gols_visitante)   -- o 90' terminou empatado
  pontos := peso_fase(fase) * (
    pal_avanca is not null and pal_avanca = real_avanca
      ? (cravou ? (empate_real ? 4 : 5) : 3)
      : 0
  )
```

> Note que a apuração **não** precisa saber "que tipo de palpite foi": se cravou, o valor
> sai de `empate_real` (4 para empate, 5 para vitória); senão, 3 se acertou quem passa, 0 se
> errou. A trava anti-empate (4 < 5) é consequência direta disso.

- Guarda: se `real_avanca` for nulo (empate no 90' sem `vencedor_penaltis`), a partida não
  está de fato resolvida — não pontua (mantém comportamento defensivo do auto-avanço).
- `security definer`, `search_path` seguro, idempotente — como hoje.

## 5. Backfill / re-apuração

Migração que **reconfronta todos os palpites de jogos de mata-mata já encerrados** e
reescreve `pontos` pela regra nova (set-based, idempotente — padrão das migrações
0014/0015/0032). Grupos não mudam.

**Edge — palpites de empate antigos:** palpites de empate feitos antes desta feature
**não têm `vencedor_avanca`** (campo novo). Pela regra nova, sem apontar quem passa →
`pal_avanca` nulo → **0 naquele jogo**. Decisão: **comportamento estrito** (re-apura todos
pela regra nova; quem palpitou empate sem dizer quem passa zera naquele jogo). É o que o
dono pediu ("confrontar todos e ajustar"), e o impacto é pequeno (hoje só 32-avos 73/74/76
encerrados; só o 74 foi decisão). O **modal explica isso** (seção 7). _Alternativa
descartada por complexidade: grandfather dando consolação a quem cravou o empate do 90'._

## 6. UI do palpite

`card-palpite.tsx` + `palpites-content.tsx`:

- **Quando mostrar o seletor "Quem passa?"** (em `terceiro-lugar`: "Quem vence?"):
  estado `liberado` **e** `partida.fase != 'grupos'` **e** placar local é empate (mandante
  == visitante, ambos preenchidos).
- Seletor com as duas seleções da partida (`mandante`/`visitante`), valor = `vencedor_avanca`.
- **Validação:** palpite empate em mata-mata **não salva** sem escolher quem passa
  (bloqueia o save + feedback visual). Palpite com vencedor no placar → seletor escondido,
  `vencedor_avanca = null`.
- Estado local paralelo em `palpites-content.tsx` (`vencedoresAvanco`), incluído na
  detecção de pendência (`ehPendente`) e no payload do upsert.
- Rascunho local (jogos futuros): persistir a escolha junto do placar.

## 7. Comunicação ao usuário

### Página de regras

`regras-content.tsx`: nova seção **"Como funciona no mata-mata"** após o bloco
"Multiplicador por fase" (antes da tabela "Pontos por fase"). Explica: vale quem passa
(5 cravou vitória + quem passa, 4 cravou empate + quem passa, 3 só quem passa, 0 errou
quem passa), que pênaltis/prorrogação contam só pra definir quem avança, e que ao palpitar
empate é preciso escolher quem passa. Segue o padrão visual existente (cards `rounded-2xl`, tokens `brand-*`/`gold-*`).
Atualizar testes que checam textos/valores (`regras-content.test.tsx`, `page.test.tsx`,
`tests/e2e/regras.spec.ts`).

> A seção "Pênaltis não contam" da página precisa ser **reescrita**: agora pênaltis/
> prorrogação contam para definir quem avança (mas não mudam o placar do tempo normal).

### Modal de aviso (novidades)

Novo `Aviso` em `aviso-atual.ts`, adicionado a `AVISOS` (e ordem no teste
`aviso-atual.test.ts`). Gatilho `mata-mata-definido` (só aparece quando já há jogos de
mata-mata). Conteúdo precisa explicar **a mudança e o motivo**, bem detalhado — texto a
cargo do agent `scribe`. Itens (rascunho a refinar):

- **Por que mudou:** mata-mata é eliminatória — não tem empate no fim, o que importa é
  quem passa. A regra antiga zerava quase todo mundo.
- **Como pontua agora:** 5 (cravou vitória + quem passa), 4 (cravou empate + quem passa),
  3 (quem passa), 0 (errou quem passa), × peso da fase.
- **O que você faz:** ao palpitar empate num jogo de mata-mata, escolha quem passa.
- **Re-apuração:** os jogos de mata-mata que já rolaram foram repontuados pela regra nova
  (transparência sobre pontos que podem ter mudado).

`id` versionado (ex.: `pontuacao-mata-mata-2026-06`) — mudar o id faz reaparecer pra todos.

## 8. Testes (3 camadas + evidências)

- **Banco (`tests/db/`)**: nova suíte para `apurar_pontos()` no mata-mata — cobre 5/4/3/0,
  empate cravado com `vencedor_avanca` certo (4) e errado (0), palpite de vencedor derivando
  o avanço, empate sem pick (0), cravou-vs-não-cravou, e idempotência da re-apuração.
  Reaproveita o harness
  harness de `mata-mata-auto-avanco.test.ts` (transação + rollback).
- **Unitário**: derivação de "pendência" com `vencedor_avanca`; lógica de quando o seletor
  aparece; validação de save.
- **Integração (MSW)**: upsert do palpite com `vencedor_avanca`; fetch/mapeamento do DTO.
- **E2E (Playwright + evidências PNG)**: palpitar empate em jogo de mata-mata exige
  escolher quem passa; modal de aviso aparece e fecha; página de regras mostra a nova
  seção. Evidências em `e2e/pontuacao-mata-mata/evidencias/*.png`.

## 9. Fora de escopo

- Não distinguir prorrogação de pênaltis na pontuação (modelo "3 caminhos" foi
  descartado por complexidade).
- Não pedir/pontuar placar da prorrogação — só o do tempo normal conta.
- Sem mudanças no fluxo do admin (o resultado real já registra `vencedor_penaltis`).

## 10. Sequência de implementação (o plano detalha)

1. Migração: coluna `vencedor_avanca` + trigger de validação.
2. Migração: `apurar_pontos()` nova + backfill de re-apuração. + testes de banco.
3. Entidade/DTO/fetcher/queries do palpite com `vencedor_avanca`.
4. UI do card-palpite (seletor condicional) + validação + estado/pendência. + testes.
5. Página de regras (nova seção + reescrita de "pênaltis"). + testes.
6. Modal de aviso (texto pelo `scribe`) + ordem dos avisos. + testes.
7. E2E + evidências. Verificação final (type-check, lint, db, unit, integração, e2e).
