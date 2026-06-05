# Design — MVP funcional do Bolão da Copa 2026

**Data:** 2026-06-05
**Status:** aprovado (design); spec em revisão
**Escopo:** tornar o app inteiro funcional lendo do Supabase — seed oficial, login Google, palpites, ranking e área administrativa para entrada manual de resultados, com apuração de pontos no servidor.

---

## 1. Objetivo

Sair do estado atual (telas-placeholder + MSW mock) para um **app funcional de ponta a ponta**:
o participante entra com Google, vê o calendário real da Copa 2026, faz palpites que travam no
apito, e vê o ranking se atualizar conforme o administrador insere os resultados. Sem dependência
de API externa em runtime — os resultados são inseridos à mão pelo admin.

### Decisões já tomadas (brainstorming)

- **Login:** Google apenas. Ao entrar, o usuário é auto-inscrito no **bolão único**.
- **Bolão:** um só, compartilhado pelo grupo. Sem convites/múltiplos bolões neste ciclo.
- **Fonte de dados do seed:** `openfootball/worldcup.json` (público, grátis, sem chave, sem limite).
  Usado **uma única vez** para gerar `supabase/seed.sql`. Nenhuma API roda depois.
- **Resultados:** inseridos manualmente pelo admin. Sem robô/Edge Function de sincronização.
- **Apuração:** gatilho no Postgres (server-authoritative), sem Edge Function.

---

## 2. Fonte de dados e geração do seed

Arquivo: `https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json`
(104 partidas; fase de grupos com 48 seleções reais; mata-mata com placeholders).

### Formato de origem (por partida)

```json
{
  "round": "Matchday 1",
  "date": "2026-06-11",
  "time": "13:00 UTC-6",
  "team1": "Mexico",
  "team2": "South Africa",
  "group": "Group A",
  "ground": "Mexico City"
}
```

### Transformações para o schema

| Campo origem                             | Coluna destino                            | Transformação                                       |
| ---------------------------------------- | ----------------------------------------- | --------------------------------------------------- |
| `team1`/`team2` (grupos)                 | `partidas.mandante_id`/`visitante_id`     | mapa nome→código FIFA (BRA, ARG…); FK em `selecoes` |
| `team1`/`team2` (mata-mata: `2A`, `W74`) | `mandante_label`/`visitante_label` (novo) | guardar rótulo; FK fica NULL até o admin definir    |
| `date` + `time` (`13:00 UTC-6`)          | `partidas.data_hora` (timestamptz)        | converter offset → UTC                              |
| `ground`                                 | `partidas.estadio`                        | cidade-sede, texto direto                           |
| `group` (`Group A`)                      | `partidas.grupo`                          | só a letra: `A`                                     |
| `round`                                  | `partidas.fase`                           | mapa de fase (abaixo)                               |

### Mapa de fase

| `round`                    | `fase`           |
| -------------------------- | ---------------- |
| `Matchday 1`…`Matchday 17` | `grupos`         |
| `Round of 32`              | `trinta-e-dois`  |
| `Round of 16`              | `oitavas`        |
| `Quarter-final`            | `quartas`        |
| `Semi-final`               | `semifinal`      |
| `Match for third place`    | `terceiro-lugar` |
| `Final`                    | `final`          |

### Como o seed é produzido

O `seed.sql` é **gerado por um script de build** (Node, em `scripts/`), não escrito à mão. O script
baixa o JSON, aplica as transformações e o mapa nome→código, e emite os `INSERT`s. Fica versionado
o **resultado** (`supabase/seed.sql`) e o **script gerador** (re-rodável se a tabela mudar).

> **Ressalva:** as seleções da fase de grupos vêm do dataset do openfootball. Se algum classificado
> divergir do sorteio oficial, é corrigível na área administrativa (ou re-rodando o gerador).

---

## 3. Mudanças no banco (migration `0002`)

1. **Nova fase** `trinta-e-dois` no domínio de `partidas.fase` (Copa de 48 tem Round of 32).
2. **FKs nuláveis**: `partidas.mandante_id` e `visitante_id` passam a aceitar `NULL`
   (slots de mata-mata ainda indefinidos).
3. **Rótulos de exibição**: `partidas.mandante_label text`, `partidas.visitante_label text`
   (ex.: "Vencedor Grupo A", "2A", "W74") usados quando a seleção real ainda não existe.
4. **Pênaltis (exibição)**: `partidas.vencedor_penaltis uuid null references selecoes(id)`
   — só para mostrar quem avançou no mata-mata; **não afeta pontos**.
5. **Admin flag**: `profiles.is_admin boolean not null default false`.
6. **Bolão padrão**: `boloes.organizador_id` passa a aceitar `NULL`; seed insere um bolão padrão
   com UUID fixo conhecido.
7. **Auto-inscrição**: estender `handle_new_user()` para também inserir o novo usuário em
   `participantes` do bolão padrão.
8. **RLS de admin em partidas**: política de `update` permitindo a quem tem `is_admin = true`
   editar resultado (`gols_*`, `status`, `vencedor_penaltis`) e preencher times do mata-mata
   (`mandante_id`, `visitante_id`); `grant update` nas colunas correspondentes.
9. **Apuração (trigger)**: ao marcar uma partida como `encerrada` com placar, recomputar
   `palpites.pontos` de todos os palpites daquela partida (detalhe na §6).
10. **Ranking**: função `SECURITY DEFINER` `get_ranking()` retornando
    `(participante_id, nome, avatar_url, pontos_totais, jogos_pontuados)` agregando `palpites.pontos`.

### Bootstrap do primeiro admin

Não há tela de "promover admin" neste ciclo. Após o primeiro login, define-se
`profiles.is_admin = true` manualmente no banco (DBeaver) — uma vez só.

---

## 4. Autenticação

- **Provedor:** Google OAuth, habilitado no painel Supabase (Authentication → Providers).
- **Client:** o `getSupabaseBrowserClient()` já existe; adicionar:
  - `signInWithGoogle()` → `supabase.auth.signInWithOAuth({ provider: 'google' })`.
  - `signOut()`.
  - Provider de sessão React (`AuthProvider`) expondo `useSession()` / `useUser()`.
- **Static export:** o OAuth redireciona de volta para o app; tratar o retorno no client
  (callback route estática + `exchangeCodeForSession` ou detecção de sessão no load).
- **Proteção de rotas:** `/palpites` e `/admin` exigem sessão; sem sessão → tela/CTA de login.
  `/admin` exige adicionalmente `is_admin`.
- **Auto-inscrição:** garantida pelo trigger de banco (não depende do client).
  **Importante (achado em review):** a inscrição em `participantes` deve ser **síncrona/atômica**
  no `handle_new_user()` (mesma transação do cadastro). Caso contrário, a policy `boloes_select`
  (que exige ser participante, e o bolão padrão tem `organizador_id = null`) deixa o bolão
  invisível até a inscrição — UI vazia. Alternativa: policy de `select` liberando o bolão padrão
  de id fixo para qualquer autenticado.

---

## 5. Camada de dados (substituir MSW)

- **Desligar MSW** para os dados reais: os fetchers passam a usar `supabase-js` direto, não mais
  `fetch('/api/*')`. `NEXT_PUBLIC_ENABLE_MSW=false`.
- **Padrão por feature** (mantém Feature-Sliced Design + React Query):
  - `features/partidas`: `usePartidas()` lê `partidas` (+ join `selecoes`), ordenado por `data_hora`.
  - `features/palpites`: `useMeusPalpites()`, `useSalvarPalpite()` (insert/update; trava via trigger).
  - `features/ranking`: `useRanking()` chama `get_ranking()`.
  - `features/admin`: `useSalvarResultado()`, `useDefinirConfronto()` (preencher times do mata-mata).
- Entidades (`entities/partida`, `palpite`, `participante`) já existem; ajustar o mapeamento
  snake_case (banco) → camelCase (app) numa função de mapeamento por feature.

---

## 6. Apuração de pontos (gatilho, server-authoritative)

Dispara quando uma partida vira `encerrada` com `gols_mandante`/`gols_visitante` preenchidos.
Recalcula `pontos` de cada palpite da partida:

```
saldo_real   = gols_mandante_real - gols_visitante_real
saldo_chute  = gols_mandante_chute - gols_visitante_chute
resultado    = sinal(saldo)   // mandante | empate | visitante

5  se placar exato (ambos os gols iguais)
3  senão, se resultado igual, NÃO é empate, E saldo igual   // vencedor + saldo de gols
1  senão, se resultado igual (vencedor certo OU empate certo) // só o vencedor / o empate
0  caso contrário
```

> **Decisão sobre empates (confirmada pelo dono):** o tier de 3 pontos ("vencedor + saldo")
> exige um **vencedor**, então **não se aplica a empates**. Um empate previsto corretamente vale
> **5** (se exato) ou **1** (se o placar do empate diferiu). Segue o texto da página de regras
> ("Só o vencedor — ou o empate" = 1 pt).

- **Tempo normal (90′)**: usa-se sempre o placar inserido (que representa o tempo normal). No
  mata-mata, empate no tempo normal **pontua como empate**; `vencedor_penaltis` é só exibição.
- O trigger roda `SECURITY DEFINER` para escrever `pontos` (coluna blindada contra o cliente). A
  trava de palpite (`enforce_palpite_lock`) já libera updates que mexem só em `pontos`.
- **Reapuração**: editar o resultado e salvar de novo recomputa os pontos daquela partida
  (idempotente).

---

## 7. Telas (UI, PT-BR, mobile-first)

| Rota         | Conteúdo                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `/` (Início) | Próximos jogos / calendário, lendo `partidas` reais                                                |
| `/palpites`  | Lista de jogos abertos; input de placar; estado "travado" após o apito                             |
| `/ranking`   | Classificação por pontos (`get_ranking()`)                                                         |
| `/regras`    | Já pronta (sem mudança)                                                                            |
| `/admin`     | **Protegida (is_admin)**: inserir/editar placar, marcar encerrada, definir confrontos do mata-mata |
| login        | CTA "Entrar com Google" quando sem sessão                                                          |

Componentes reaproveitam o design system existente (`brand-*`, `gold-*`, `AppShell`, `BottomNav`).
A aba **Admin** só aparece na navegação para quem é admin.

---

## 8. Arquitetura / unidades

```
app/            → rotas (/, /palpites, /ranking, /regras, /admin) + callback de auth
widgets/        → app-shell (já existe; nav condicional p/ admin)
features/
  partidas/     → leitura de jogos (já existe; trocar fetcher p/ supabase)
  palpites/     → fazer/editar palpite
  ranking/      → ler ranking
  admin/        → inserir resultado, definir confronto
  auth/         → AuthProvider, useSession, signIn/signOut
entities/       → partida, palpite, participante, selecao (ajustar mapeamento)
shared/lib/
  supabase/     → client (já existe) + helpers de auth e mapeamento
supabase/
  migrations/   → 0002_app_funcional.sql
  seed.sql      → gerado pelo script
scripts/        → gerador do seed a partir do openfootball
```

Cada feature tem uma fronteira clara: hooks de dados (React Query) + componentes de UI, sem vazar
SQL para a camada de tela.

---

## 9. Fora de escopo (próximos ciclos)

- Múltiplos bolões e convites.
- Robô de sincronização de resultados via API de futebol.
- Tela de promover/gerir admins (bootstrap manual por enquanto).
- Notificações (o sino do top-bar segue decorativo).
- i18n dos nomes de seleção (exibir em inglês/abreviação por ora).

---

## 10. Riscos e mitigações

- **Times de grupo divergentes do sorteio oficial** → corrigíveis no admin / re-rodando o gerador.
- **Placeholders de mata-mata** → FKs nuláveis + rótulo; admin define conforme classifica.
- **Fuso horário** → converter `UTC-6/-4` para UTC no gerador; armazenar sempre `timestamptz` UTC.
- **OAuth em static export** → validar o fluxo de redirect/callback sem servidor Next.
- **Escrita de `pontos`/resultado** → apenas via trigger `SECURITY DEFINER` e RLS de admin; cliente
  nunca escreve `pontos` nem resultado sem `is_admin`.
- **Escopo grande** → implementar em fatias verticais com commits atômicos
  (migration → seed → auth → partidas → palpites → ranking → admin → apuração).
