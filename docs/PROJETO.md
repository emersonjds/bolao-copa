# Bolão da Copa 2026 — Handbook (leia isto primeiro)

> Porta de entrada pra **agents e devs**. Resume o projeto pra você trabalhar numa tarefa
> sem reler o código todo. Regras de ouro em `CLAUDE.md` (commits, idioma, arquitetura).
> Índice de docs em `docs/README.md`.

## 1. Produto
Bolão de palpites da Copa do Mundo FIFA 2026 para grupos de amigos. SPA estática (Next 16,
`output: "export"`) que fala **direto com o Supabase**. UI 100% em **PT-BR**.

## 2. Arquitetura (Feature-Sliced Design)
`app → widgets → features → entities → shared` (só importa de camadas abaixo, nunca lateral).
- `app/` rotas/layout · `features/` casos de uso (palpites, ranking, calendario, partidas, admin, auth, dashboard)
- `entities/` modelos de domínio · `shared/` infra (ui, lib, supabase client, hooks).
- Dados do banco vêm em snake_case PT-BR; os **fetchers** (`*/api/*-fetcher.ts`) mapeiam para o modelo camelCase.

## 3. Domínio & regras de pontuação (fonte de verdade: Supabase)
Vale o **placar do tempo normal (90')** — prorrogação e pênaltis **não contam**.
- Base por jogo: `5` cravou vitória · `4` cravou empate · `3` acertou vencedor · `2` acertou empate · `0` errou.
- **Multiplicador por fase** (migration `0015`): grupos/32-avos/3º-lugar **×1**, oitavas/quartas **×2**, semi/final **×3** (cravar a final = 15). Função `peso_fase()`.
- **Empate decidido nos pênaltis** = empate para pontuação (quem palpitou empate pontua; quem palpitou vitória erra).
- **Desempate no ranking** (migration 0017): pontos → placares cravados → resultados certos → nome (alfabético).
- **Palpite trava no apito** (`enforce_palpite_lock`, 0012): editável só até o início da partida.
- Detalhe completo e didático: ver tela `/regras` (`src/app/regras/page.tsx`) e `CLAUDE.md` §10.

## 4. Backend / dados (Supabase)
Postgres + RLS + RPCs + Auth (Google OAuth). Schema versionado em `supabase/migrations/` (0001–0017).
Funções-chave: `apurar_pontos()` (trigger ao encerrar partida), `peso_fase()`, `get_ranking()`,
`enforce_palpite_lock()`, `handle_new_user()`. Seed: `supabase/seed.sql`. Reset cirúrgico:
`supabase/reset-cenario-teste.sql`. Tabelas: profiles, selecoes, partidas, boloes, participantes, convites, palpites.

## 5. Ambientes
| Ambiente | O que é | App aponta via |
|---|---|---|
| **local (dev)** | `supabase start` (Docker: Postgres + APIs) | `.env.development.local` → `127.0.0.1:54321` (já tem prioridade no `pnpm dev`) |
| **prod** | projeto Supabase cloud (com testers reais) | `.env.local` / vars do host |

- **Inspecionar o banco local:** DBeaver → PostgreSQL `127.0.0.1:54322`, db/user/pass = `postgres`; ou Supabase Studio em `http://127.0.0.1:54323`.
- **Migrations:** nascem no local (`supabase db reset` valida) → promovidas com `supabase db push` (só aplica novas; não apaga dados). Postgres puro não serve (o app precisa de Auth/RLS/RPC).
- **Staging cloud:** recomendado só quando precisar de OAuth real e2e / QA sem Docker / time — hoje não é necessário. Detalhe: ver `docs/audits/` e o handbook.

## 6. Testes (3 camadas — todas verdes)
| Camada | Comando | O que cobre | Estado |
|---|---|---|---|
| Unit/integração (Vitest+MSW, jsdom) | `pnpm test:run` | componentes/hooks/fetchers (mocks) | ~411 testes (~99%) |
| Banco (Vitest+`pg`, node) | `pnpm test:db` | regra de pontos, multiplicador, pênalti, idempotência, trava, **desempate**, grants | 20 testes |
| E2E (Playwright) | `pnpm test:e2e` | telas fase a fase, ranking/vencedor, palpitar, navegação | 72 testes |

- **Pré-requisito e2e/banco:** `supabase start` + `pnpm scenario:seed` (cria 5 contas + palpites + resultados + ranking; senha `Senha-Demo-2026!`). Plano do cenário: `docs/superpowers/specs/2026-06-06-validacao-cenarios-todas-fases-design.md`.
- **Login em dev:** o app só tem Google OAuth (não roda no local) → use o botão **"Logar em dev"** (`/palpites`, só em `NODE_ENV=development`) ou `pnpm scenario:open [email]`.
- **Guard anti-prod:** seeds, dev-login e `playwright.config` abortam se a URL não for local.

## 7. Segurança
Ver `docs/audits/security-review.md`. C-1 (crítico, auto-promoção a admin) corrigido na 0016 + headers em `public/_headers`. `service_role` nunca vai pro frontend; proteção real = RLS.

## 8. Performance
Ver `docs/audits/performance-audit.md` (métricas) e o plano `docs/superpowers/plans/2026-06-07-performance.md`.
Feitos: home só próximos jogos, `getSession` local (sem round-trip), paginação do histórico, preconnect, staleTime, cache headers.

## 9. Convenções (resumo — detalhe em CLAUDE.md)
- Commits **micro/atômicos**, mensagem em **inglês** imperativo curto, **sem** rodapé de IA.
- **UI sempre PT-BR**; domínio em PT-BR (Partida, Palpite, Participante…). Push pra prod é sempre humano.
- Antes de concluir: `pnpm type-check`, `pnpm lint`, testes verdes, sem `console.log`.

## 10. Estado atual & pendências
- ✅ Pontuação com multiplicador por fase + desempate (em prod via `db push`).
- ✅ Segurança: C-1/A-1/A-2/A-3/M-1/M-2 corrigidos (migrations 0016/0018 + headers).
- ✅ Performance: quick-wins + alto impacto aplicados.
- ✅ **Cobertura**: 100% de linhas e funções (442+ testes; ~3% de branches são fallbacks defensivos inalcançáveis, documentados).
- ✅ Home "jogos por dia" — agrupa os 2 próximos dias com jogo (spec `docs/design/home-jogos-por-dia.md`).
- ✅ Comentários: limpos (só o "porquê" não-óbvio).
- ⏳ B-1 (convite uso único) e M-3 (filtro por `bolao_id`): adiados — só relevantes quando houver fluxo de convite / múltiplos bolões. Habilitar **PITR** em prod (ação no painel).
- ⏳ Refactor de identificadores p/ inglês: **descartado** (baixo valor / alto custo; UI e domínio seguem PT-BR).
- ⚠️ Migrations novas (0015–0018) precisam de `supabase db push` quando ainda não aplicadas em prod (0015–0017 já foram; 0018 pendente).
