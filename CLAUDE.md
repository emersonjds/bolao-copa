# CLAUDE.md — Bolão da Copa 2026

Regras de ouro para todo desenvolvimento assistido por IA neste projeto. Leia e siga integralmente antes de qualquer tarefa.

---

## 1. Identidade do Produto

- **Nome**: Bolão da Copa 2026
- **Domínio**: bolão de palpites da Copa do Mundo FIFA 2026 (11/jun–19/jul/2026) para grupos de amigos
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, pnpm
- **Tipo**: SPA com static export (`output: "export"`) — sem servidor, dados via MSW até o backend existir
- **Deploy**: Cloudflare Workers (static assets)
- **Idioma da UI**: português brasileiro em 100% dos textos visíveis

## 2. Identidade Visual

- `brand-500` = `#16a34a` (verde-gramado — cor principal)
- `accent` = dourado/troféu (`#f59e0b`)
- Light mode como padrão; classes `dark:` podem existir mas o toggle não é prioridade
- Clima: futebol, Copa do Mundo, social/competitivo entre amigos

## 3. Regras de Git — OBRIGATÓRIO

- **Micro-commits atômicos** — uma mudança lógica por commit
- Mensagens em **inglês**, imperativo curto: `add X`, `fix Y`, `translate Z`
- **Proibido mencionar** Claude, Anthropic, IA, agent ou qualquer ferramenta de IA em mensagens de commit, PRs ou comentários
- **Proibido** rodapé `Co-Authored-By: Claude` ou similar
- **O push final é sempre do desenvolvedor humano** — nunca `git push` sem confirmação explícita
- Hooks: `git config --local core.hooksPath .githooks` (uma vez por clone)
- Versionados: `.claude/agents/`, `.claude/settings.json`, `.mcp.json`. Nunca commitar `.claude/settings.local.json`, `.serena/`, sessões/credenciais de IA

## 4. Qualidade de Código

- Prefira editar arquivos existentes a criar novos; sem abstrações prematuras; sem código morto
- Comente só o "porquê" não-óbvio
- TypeScript: tipos explícitos em interfaces públicas; **sem `any`** (use `unknown` + narrowing); props sempre com interface nomeada
- Nomes semânticos — proibido identificadores de uma letra
- Tailwind: mobile-first (`sm:`/`md:`/`lg:`), usar tokens do design system (`brand-*`, `gray-*`)

## 5. Arquitetura — Feature-Sliced Design

```
src/
├── app/          ← Next.js App Router. Rotas e layouts. Sem regra de negócio.
├── widgets/      ← UI composta (header, ranking-panel). Junta features+entities.
├── features/     ← Casos de uso (fazer-palpite, ver-ranking, listar-jogos).
├── entities/     ← Modelos de domínio (partida, palpite, participante, selecao, bolao).
└── shared/       ← Infra reutilizável (ui, lib, hooks, providers).
```

**Regra de import**: só importar de **layers abaixo** (`app → widgets → features → entities → shared`). Nunca o contrário, nunca lateral entre slices da mesma layer.

## 6. Dados / API

- Backend é **Supabase** (Postgres + RLS + RPCs). O app é SPA static export e fala **direto** com o Supabase via `@supabase/ssr` (`getSupabaseBrowserClient`, `src/shared/lib/supabase/`). **Não há MSW** — todos os dados (partidas, palpites, ranking) vêm do banco real.
- Usa a **publishable key** (pública por design; a proteção é a RLS no Postgres). A `service_role` NUNCA vai para o frontend.
- Config em `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Schema/migrations em `supabase/migrations/` (aplicar com `supabase db push`).

## 7. Segurança

- Nunca commitar secrets/tokens/chaves de API
- Integridade da pontuação: apuração de pontos é fonte de verdade do servidor (não confiar no cliente) — relevante quando o backend existir
- Validar inputs de palpite no servidor; antifraude na pontuação

## 8. Review (antes de concluir)

- [ ] `pnpm type-check` sem erros
- [ ] Textos da UI em PT-BR
- [ ] Responsivo (375px, 768px, 1280px)
- [ ] Sem `console.log` / código de debug
- [ ] Imports não usados removidos

## 9. Agentes disponíveis

Especialistas de domínio: `po-bolao-copa`, `arquiteto-software-apis-integracoes`, `backend-integracoes-futebol`, `analista-mercado-concorrencia`, `frontend-performance-expert`, `ux-ui-designer`, `scrum-master-jira`, `red-team-web-offensive`.
Execução e qualidade: `bug` (QA/quality gate), `scribe` (i18n PT-BR, docs).

Regra: **um agent por função, sem duplicação**.

## 10. Domínio: Bolão da Copa

- **Bolão**: grupo de palpites com regras de pontuação próprias
- **Participante**: o amigo que entra no bolão e faz palpites
- **Partida/Jogo**: confronto entre duas seleções, com data, fase e placar
- **Palpite**: aposta do participante no placar de uma partida
- **Pontuação**: regras que convertem palpite vs. resultado em pontos (ex.: placar exato, acerto do vencedor)
- **Ranking**: classificação dos participantes por pontos
- **Fases**: grupos → oitavas → quartas → semi → final
