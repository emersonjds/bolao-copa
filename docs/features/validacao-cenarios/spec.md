# Design — Validação ponta a ponta de todas as fases com pontuação

**Data:** 2026-06-06
**Objetivo:** ter um ambiente reproduzível (Supabase local) e cobertura de testes que
valida **todas as fases** do bolão (grupos → 32-avos → oitavas → quartas → semi →
3º lugar → final) e **todos os casos de pontuação** (5/4/3/2/0), pra liberar pro
público com confiança. Escopo: **cobertura completa rodando localmente** (sem CI por agora).

---

## 1. Problema

- O app é SPA static export que fala **direto com o Supabase**. Os testes E2E hoje sobem
  `pnpm dev` lendo `.env.local`, que aponta pra **produção** (onde há testers reais).
- A **pontuação não está no frontend** — é a função Postgres `apurar_pontos()` (migration
  0014). Os testes de integração (Vitest + MSW) **não validam** a regra de pontos de verdade.
- O `supabase start` quebrava: a versão antiga da CLI baixava uma `storage-api` incompatível.

## 2. Fundação (já verificada nesta sessão)

- CLI Supabase atualizada (2.22 → 2.105).
- `supabase/config.toml`: `[storage] enabled = false` — a imagem `storage-api` fixada na CLI
  aponta pra tag inexistente no registry e derruba o start. O app não usa Storage (avatar é
  opcional). Reabilitar no futuro exige pinar uma versão boa.
- `supabase start` sobe com migrations + `seed.sql` aplicados. Conferido:
  grupos 72 · trinta-e-dois 16 · oitavas 8 · quartas 4 · semifinal 2 · terceiro-lugar 1 ·
  final 1 · 48 seleções · bolão padrão `00000000-0000-0000-0000-000000000b01` · 0 participantes.
- Endpoints locais: API `http://127.0.0.1:54321`, DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## 3. Abordagem escolhida

**Seed de cenário canônico (Abordagem A).** Um SQL idempotente cria um estado fixo e conhecido;
os testes (banco e Playwright) afirmam contra ele. Casa com os idiomas do repo (`seed.sql`,
`reset-cenario-teste.sql`), é determinístico e rápido. Usuário logado vem do `auth.setup.ts` existente.

## 4. Componentes

### 4.1 Ambiente de teste isolado

- `.env.test` (gitignored) com os valores **locais**: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable local>`, `SUPABASE_SERVICE_ROLE_KEY=<secret local>`.
- `.env.test.example` (commitado) documentando as chaves, com instrução de pegá-las via `supabase status`.
- Playwright e os testes de banco leem `.env.test`, **nunca** `.env.local` (prod). Ajuste no
  carregamento de env do `playwright.config.ts` pra priorizar `.env.test` quando presente.

### 4.2 Seed de cenário — `supabase/scenario-e2e.sql`

Idempotente (re-rodável), aplicado como `postgres` (ignora RLS). NÃO é migration (fica fora de
`supabase/migrations/`, como o `reset-cenario-teste.sql`).

- **3 participantes de teste** com perfis distintos no bolão padrão:
  - `craque` — acerta muito (puxa o topo do ranking);
  - `mediano` — acertos parciais;
  - `azarão` — erra quase tudo (fundo do ranking).
  - Precisam existir em `auth.users` + `profiles` + `participantes`. Inseridos direto via SQL
    como `postgres` (o trigger `handle_new_user` cobre cadastro via Auth; aqui inserimos à mão
    de forma determinística, com UUIDs fixos).
- **Em cada fase**, ao menos um jogo `encerrada` com placar, e palpites desenhados pra disparar
  **cada balde de pontos**:
  - `5` — cravou placar de **vitória**; `4` — cravou placar de **empate**;
  - `3` — acertou **vencedor**, placar errado; `2` — acertou **empate**, placar errado;
  - `0` — errou o resultado.
- **Um jogo de mata-mata com `vencedor_penaltis`** preenchido pra provar que **pênaltis não contam**
  (vale o tempo normal — empate no 90' pontua como empate).
- **Alguns jogos `agendada` com data futura** (o seed já tem datas 2026-06-11+) pros testes de
  _fazer palpite_ (a trava `enforce_palpite_lock` só bloqueia após o apito).
- **Ranking esperado** somado à mão e documentado no topo do SQL e no spec, pra os testes afirmarem
  pontos e ordem exatos.

### 4.3 Camadas de teste

1. **Banco — a regra de pontos** (`tests/db/`): roda contra o Postgres local (`:54322`). Cobre:
   - cada balde 5/4/3/2/0 isoladamente;
   - pênaltis ignorados (empate no 90' com `vencedor_penaltis` ≠ vitória);
   - **idempotência**: reapurar a mesma partida não muda os pontos;
   - reapuração ao **editar o placar** recomputa corretamente.
     Implementação: script Node/`vitest` usando `pg` (ou `psql`) — decisão fina fica pro plano.
2. **Playwright E2E — a experiência** (`tests/e2e/`): contra o app subido com `.env.test`.
   - **navegação por fase**: um caminho que passa por cada aba (Grupos, R32, Oitavas, Quartas,
     Semis, 3º lugar, Final) e confirma que os jogos da fase renderizam;
   - **ranking**: pontos e ordem batem o ranking esperado do cenário;
   - **histórico**: palpites encerrados mostram os pontos certos por balde;
   - **fazer palpite**: preenche e salva um palpite num jogo `agendada`; confirma persistência;
   - **trava**: palpite de jogo já iniciado não é editável.
3. **Vitest** — mantém os ~99% atuais; sem regressão.

### 4.4 Wiring (`package.json` + docs)

- Scripts:
  - `db:local` → `supabase start` + aplica `scenario-e2e.sql`;
  - `db:reset:scenario` → reaplica o cenário (reset cirúrgico + seed de cenário);
  - `test:db` → roda os testes da regra de pontos contra o local;
  - `test:e2e:local` → sobe app com `.env.test` e roda Playwright.
- `tests/README.md` (ou seção no existente) explicando o fluxo: subir local → seed cenário →
  rodar camadas.

## 5. Fora de escopo (YAGNI)

- CI / GitHub Actions (fica pra um próximo ciclo).
- Storage/avatares no ambiente local.
- Cobrir os 104 jogos — só representantes por fase e por balde de pontos.

## 6. Riscos & mitigações

- **`.env.test` vazar pra prod nos testes** → testes falham explícito se a URL não for `127.0.0.1`
  (guarda no setup).
- **Chaves locais mudarem entre máquinas** → `.env.test.example` + instrução `supabase status`;
  os valores são defaults estáveis da CLI, mas documentados.
- **Datas do seed ficarem no passado** (hoje 2026-06-06; Copa começa 2026-06-11) → jogos de
  _fazer palpite_ dependem de data futura; se a suíte rodar após o início da Copa, o cenário
  fixa explicitamente status `agendada` e usa datas bem à frente.

## 7. Critério de pronto

- `supabase start` + `scenario-e2e.sql` reproduzem o mesmo estado em qualquer máquina.
- `test:db` verde cobrindo 5/4/3/2/0 + pênaltis + idempotência.
- `test:e2e:local` verde cobrindo todas as fases + ranking + histórico + fazer/travar palpite.
- Nenhum teste aponta pra produção.
