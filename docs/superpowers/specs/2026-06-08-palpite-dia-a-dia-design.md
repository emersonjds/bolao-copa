# Design — Palpite "dia a dia"

**Data:** 2026-06-08
**Status:** aprovado para planejamento
**Autor:** brainstorming assistido (agents `arq`, `back`, `pixel`)

---

## 1. Problema e objetivo

Hoje o participante pode palpitar em **todos** os jogos da Copa de uma vez. Isso
remove o incentivo de voltar à plataforma com frequência.

**Objetivo:** liberar os palpites **dia a dia**. Para os jogos de **hoje**, o
botão de palpitar funciona. Para os jogos de **amanhã** (D+1), a pessoa **vê e
pode digitar** os campos de placar (guardados como rascunho local), mas o botão
de salvar só libera no dia do jogo. Jogos de D+2 em diante não aparecem.

A integridade é **sempre do servidor**: mesmo que o front libere o botão por
engano (relógio adiantado, bug), o Postgres **recusa** o palpite fora da janela.

### Decisões de produto (travadas)

| Decisão | Escolha |
|---|---|
| Campos de jogos futuros | **Digitar e guardar rascunho** (localStorage) |
| Horizonte visível | **Só o próximo dia (D+1)** |
| Fuso que define "o dia" | **Horário de Brasília** (`America/Sao_Paulo`) |
| Incentivo nesta versão | **Só o essencial** (sem streak/push) |

---

## 2. A regra: janela com duas bordas

Hoje a trava (`enforce_palpite_lock`, migration 0012) só checa a **borda
superior**: `now() >= data_hora` (apito). A mecânica nova adiciona a **borda
inferior**, formando uma janela:

```
        ┌──────── JANELA VÁLIDA ────────┐
   ─────┤                               ├─────
   janela_inicio                    data_hora
   (meia-noite BRT                  (apito inicial)
    do dia do jogo)
   [recusa: cedo]   [pode palpitar]   [recusa: começou]
```

**Janela exata:** `[janela_inicio, data_hora)` — fechada no início, aberta no fim.

### Definição canônica de "o dia"

Uma única função SQL resolve o fuso **uma vez**. Ninguém calcula meia-noite de
Brasília em JavaScript.

```sql
create or replace function public.janela_palpite_inicio(p_data_hora timestamptz)
returns timestamptz
language sql
immutable
as $$
  select date_trunc('day', p_data_hora at time zone 'America/Sao_Paulo')
           at time zone 'America/Sao_Paulo';
$$;
```

- Usa a **zona nomeada** `America/Sao_Paulo`, nunca offset fixo `-03` (protege
  contra reintrodução de horário de verão).
- Em jun/jul 2026, BRT é fixo em UTC−3 (Brasil aboliu o DST em 2020).

---

## 3. Arquitetura: onde mora cada responsabilidade

| Responsabilidade | Dono |
|---|---|
| Definir "o dia" (BRT → instante) | **Postgres** — `janela_palpite_inicio()` |
| Expor o instante de abertura | **View** sobre `partidas` (`janela_inicio`) |
| Decidir o estado pra pintar a UI | **Front** — compara instantes (epoch) |
| **Recusar** gravação fora da janela | **Trigger** `enforce_palpite_lock` (fonte de verdade) |

### Contrato (shape do payload)

A `partida` ganha **um campo derivado**, calculado no banco:

```
janela_inicio: string   // ISO 8601 UTC — instante de abertura (BRT já resolvido)
data_hora:     string   // ISO 8601 UTC — instante de fechamento (apito) — já existe
```

O front **deriva** o estado dos dois instantes; o banco **não** emite booleano
pronto (booleano vira snapshot e mente na virada do dia com a aba aberta).

### View

```sql
create or replace view public.partidas_com_janela
with (security_invoker = true) as
  select p.*, public.janela_palpite_inicio(p.data_hora) as janela_inicio
  from public.partidas p;
```

RLS de leitura inalterada (`security_invoker` herda as policies de `partidas`).
O `partidas-fetcher.ts` passa a selecionar de `partidas_com_janela`.

### Estado derivado no front

```
estadoPalpite(partida, agora):
  agora >= data_hora        → 'encerrado'
  agora <  janela_inicio    → 'futuro'
  senão                     → 'liberado'
```

### "Só o próximo dia (D+1)" — sem fuso no cliente

Sai dos próprios dados, comparando instantes:

- **Liberados:** `estadoPalpite === 'liberado'`.
- **Próximo dia:** o grupo de jogos cujo `janela_inicio` é o **menor** entre os
  futuros (`agora < janela_inicio`). Mostra só esse grupo. D+2+ fica de fora.

Nenhuma conta de calendário em JS — só `min()` sobre instantes.

### Virada do dia com a aba aberta

1. **Timer de borda:** `setTimeout` até o menor instante futuro relevante
   (próximo `janela_inicio` a abrir ou próximo `data_hora` a fechar). Ao
   disparar, `queryClient.invalidateQueries(partidasKeys.all)` e re-agenda.
   Não usar polling de 1s (bateria).
2. **`refetchOnWindowFocus: true`** — cobre "voltou à aba depois da meia-noite".
3. **`staleTime`** dos dados continua longo (placar muda pouco) — a virada não
   depende dele, e sim do timer de borda.

---

## 4. Enforcement no servidor (migration 0019)

`CREATE OR REPLACE` em `enforce_palpite_lock()` — sem ALTER TABLE, sem objeto
novo além da função `janela_palpite_inicio()` e da view. O trigger
`trg_palpite_lock` (declarado em 0001) continua apontando para a mesma função.

Ordem das checagens dentro do trigger:

1. Imutabilidade de `participante_id` / `partida_id` (igual 0012).
2. Bypass de apuração: gols inalterados → passa (apuração escreve `pontos` muito
   depois, com a janela fechada; precisa passar).
3. **Borda inferior (nova):** `now() < janela_palpite_inicio(kickoff)` →
   `raise exception 'palpite_nao_liberado'`.
4. Borda superior (existente): `now() >= kickoff` →
   `raise exception 'palpite_encerrado'`.

### Códigos de erro → mensagem PT-BR

| Código (`message`) | Quando | Mensagem na UI |
|---|---|---|
| `palpite_nao_liberado` | antes da meia-noite BRT do dia do jogo | "Os palpites deste jogo abrem no dia da partida." |
| `palpite_encerrado` | após o apito | "Esta partida já começou." |

---

## 5. UX (essencial)

Princípio: **um sinal por estado**, sempre no mesmo canto (topo-direito do card).
Sem empilhar badges.

### Os 3 estados do card

**A — Hoje, liberado**
- Borda `border-brand-500` + `ring-1 ring-brand-500/20` (verde-gramado).
- Pill `HOJE · 20h` (`bg-brand-100 text-brand-700`).
- Inputs ativos; botão funciona.

**B — Futuro (amanhã), travado mas preenchível**
- Borda `border-amber-200 border-dashed`; fundo `bg-amber-50/40`.
- Pill âmbar com ícone `Clock`: `Libera amanhã`.
- **Inputs ativos** — digita rascunho.
- Sem cadeado (cadeado é exclusivo do estado "encerrado").

**C — Encerrado / já apitou**
- `bg-card/60 opacity-80`, badge `Lock + Encerrado` (estilo atual).
- Se houver resultado + pontos: faixa de rodapé com placar oficial e pill de pts.

### Cabeçalho de grupo (sticky)

```
Rodada 1 · Seg, 9 Jun                 [● HOJE]
Ter, 10 Jun                       [Libera amanhã]
Você pode preparar seus palpites aqui    (subtexto xs muted)
```

### Rascunho local

- Persistido em `localStorage`, chave `palpite-rascunho:${userId}:${partidaId}`.
- Carregado no mount; some quando o palpite é efetivamente salvo no servidor.
- Microcopy (card futuro com rascunho): "Rascunho guardado · salva quando liberar".
- Microcopy (card futuro vazio): "Você pode preparar seu palpite aqui".

### Botão de salvar

- Opera **só sobre jogos de hoje** (`estadoPalpite === 'liberado'`).
- Label: **"Salvar palpites de hoje"**.
- Desabilita quando não há pendentes de hoje.
- Toast ao salvar: "X palpites de hoje salvos. Rascunhos futuros guardados no
  aparelho."

### Quem perdeu o dia

- No histórico, card neutro (`bg-muted/50`), placar do palpite como `—`, texto
  "Você não palpitou neste jogo". Sem vermelho, sem "perdeu X pontos".

---

## 6. Tratamento de erros e bordas

- **Clock skew** (relógio do celular adiantado): botão pode liberar cedo →
  servidor recusa → mensagem amigável. Só UX, não fura segurança.
- **Jogo de madrugada no BR** (ex.: 21h Los Angeles = 01h BRT do dia seguinte):
  janela abre meia-noite BRT desse dia — pouco tempo, mas correto. A UI mostra o
  horário de Brasília no card.
- **Partida remarcada:** `data_hora` muda → `janela_inicio` recalcula sozinho
  (view + função). Palpites já feitos não são revalidados retroativamente.
- **Dois jogos no mesmo dia:** cada um tem sua janela independente; ambos
  palpitáveis enquanto antes do apito.

---

## 7. Plano de testes (cobertura total)

Requisito de primeira classe: a feature nasce **totalmente coberta**, nas 4
camadas. Mantém o padrão atual do projeto (~100% de linhas no front; lógica de
domínio crítica testada no Postgres).

### Camada 1 — Banco / Postgres (`tests/db/`, `pnpm test:db`)

Novo arquivo `tests/db/palpite-janela.test.ts` (estilo do `apurar-pontos.test.ts`):

- `janela_palpite_inicio()` retorna a meia-noite BRT correta para vários horários
  (incluindo conversão de fuso).
- INSERT **antes** da janela → recusa `palpite_nao_liberado`.
- INSERT na **meia-noite BRT exata** → aceita.
- INSERT **dentro** da janela (dia do jogo, antes do apito) → aceita.
- INSERT **1 seg antes** da meia-noite BRT → recusa.
- UPDATE de gols **depois do apito** → recusa `palpite_encerrado` (sem regressão).
- Borda "madrugada BR" (jogo 21h Los Angeles → janela abre meia-noite BRT do dia
  seguinte) → recusa antes / aceita depois da virada.
- Borda "mesmo dia" (jogo 15h Nova York) → janela no mesmo dia BRT.
- Apuração: UPDATE de `pontos` com gols inalterados, janela fechada → aceita
  (sem regressão do bypass).
- Imutabilidade de `participante_id` / `partida_id` → sem regressão.
- A view `partidas_com_janela` expõe `janela_inicio` correto.

### Camada 2 — Unit (lógica pura, vitest)

- `estadoPalpite(partida, agora)` → `liberado`/`futuro`/`encerrado` em todas as
  bordas (inclusive limites exatos).
- Filtro D+1: dado um conjunto de jogos, retorna só os liberados + o grupo futuro
  de menor `janela_inicio`; nunca D+2.
- Rascunho local: salvar / ler / limpar; isolamento por `userId`; tolerância a
  dado corrompido no `localStorage`.
- `traduzir-erro-salvar`: ramo `palpite_nao_liberado` → mensagem PT-BR correta;
  mantém os ramos existentes.
- Cálculo do timer da próxima borda (menor instante futuro relevante).

### Camada 3 — Componente (Testing Library)

- `CardPalpite` renderiza os 3 estados (verde/âmbar/cadeado) com badges e
  microcopy corretos.
- Card futuro: digitar persiste rascunho (localStorage mockado) e mostra o
  microcopy de rascunho.
- `BotaoSalvar`: conta só pendentes de hoje; label "Salvar palpites de hoje";
  desabilita sem pendentes de hoje.
- `palpites-content`: mostra hoje + D+1; **não** mostra D+2.
- Virada do dia: com `vi.useFakeTimers`, avançar o relógio pela meia-noite faz o
  card virar `futuro` → `liberado` e reabilitar o botão.

### Camada 4 — E2E (Playwright, `tests/e2e/`)

- Cenário com jogos hoje + amanhã: login; jogo de hoje salva e aparece como
  salvo; botão do jogo de amanhã travado, mas o campo aceita digitação; reload
  preserva o rascunho; jogo de D+2 não aparece.

### Portões de qualidade

- Módulos novos do front: manter ~100% de linhas.
- `pnpm test:db` cobre o banco; incluído no fluxo de validação.
- `pnpm validate` (type-check + lint + format + unit) verde.

---

## 8. Arquivos afetados (mapeamento)

| Arquivo | Mudança |
|---|---|
| `supabase/migrations/0019_*.sql` | **novo** — função `janela_palpite_inicio`, view `partidas_com_janela`, `CREATE OR REPLACE enforce_palpite_lock` |
| `src/entities/partida/model/partida.ts` | + `janelaInicio: string` |
| `src/features/partidas/api/partidas-fetcher.ts` | seleciona de `partidas_com_janela` (+ `janela_inicio`) |
| `src/features/partidas/api/queries.ts` | timer de borda + `refetchOnWindowFocus` |
| `src/features/palpites/lib/estado-palpite.ts` | **novo** — `estadoPalpite()` + filtro D+1 |
| `src/features/palpites/lib/rascunho-local.ts` | **novo** — persistência localStorage |
| `src/features/palpites/components/card-palpite.tsx` | 3 estados visuais + inputs de rascunho |
| `src/features/palpites/components/palpites-content.tsx` | inclui D+1; deriva estado por card |
| `src/features/palpites/components/lista-palpites.tsx` | cabeçalho com pill de status |
| `src/features/palpites/components/botao-salvar.tsx` | escopo "só hoje" + label |
| `src/features/palpites/lib/traduzir-erro-salvar.ts` | ramo `palpite_nao_liberado` |
| `tests/db/palpite-janela.test.ts` | **novo** — cobertura de banco |
| testes unit/componente/e2e | conforme seção 7 |

---

## 9. Não-objetivos (YAGNI nesta versão)

- Streak / "dias seguidos", notificações push, toasts de "você perdeu ontem".
- Horizonte além de D+1.
- Fuso configurável por usuário.
- RPC dedicada `jogos_com_estado()` (a view + derivação no front bastam).
