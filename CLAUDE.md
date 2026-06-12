# CLAUDE.md — Bolão da Copa 2026

Regras de ouro para todo desenvolvimento assistido por IA neste projeto. Leia e siga integralmente antes de qualquer tarefa.

> 📖 **Mapa operacional, estado atual e how-to:** [`docs/PROJETO.md`](docs/PROJETO.md) (handbook) e [`docs/README.md`](docs/README.md) (índice das docs). Leia o handbook para trabalhar numa tarefa sem reler o projeto todo.

---

## 1. Identidade do Produto

- **Nome**: Bolão da Copa 2026
- **Domínio**: bolão de palpites da Copa do Mundo FIFA 2026 (11/jun–19/jul/2026) para grupos de amigos
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, pnpm
- **Tipo**: SPA com static export (`output: "export"`) — sem servidor próprio; dados direto do Supabase (MSW só nos testes)
- **Deploy**: Netlify (static export — publish `out/`)
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

> **Estas regras são OBRIGATÓRIAS para qualquer pessoa ou agent que escreva código neste projeto** — valem sempre, em toda tarefa e em todo subagent acionado.

- **Comentários: só o extremamente necessário.** Comente apenas o "porquê" não-óbvio de uma **regra** (de negócio, segurança, fuso, armadilha). Proibido comentário que narra/reescreve o que o código já diz. Na dúvida entre comentar e não comentar um trecho óbvio, **não comente**.
- **Legível em ≤10s por qualquer nível** (jr, pleno, sênior). Se exige mais que isso para entender, simplifique — nomes claros, funções pequenas de propósito único, sem esperteza desnecessária.
- **Melhores padrões E simples.** O melhor padrão aqui é o mais simples que resolve bem; padrão sofisticado que dificulta a leitura é o padrão errado. Sem abstração prematura, sem código morto.
- **Performance e escalabilidade sempre no radar.** Evite trabalho desnecessário (re-render, recomputação, query/loop redundante); escolha estruturas/algoritmos que aguentam crescer. Mas sem micro-otimização que prejudique a clareza — meça antes de complicar.
- Prefira editar arquivos existentes a criar novos.
- TypeScript: tipos explícitos em interfaces públicas; **sem `any`** (use `unknown` + narrowing); props sempre com interface nomeada.
- Nomes semânticos — proibido identificadores de uma letra.
- Tailwind: mobile-first (`sm:`/`md:`/`lg:`), usar tokens do design system (`brand-*`, `gray-*`).

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
- Integridade da pontuação: a apuração é fonte de verdade do servidor (função `apurar_pontos()` no Supabase) — nunca confiar no cliente
- Validar inputs de palpite no servidor; antifraude na pontuação

## 8. Review (antes de concluir)

- [ ] `pnpm type-check` sem erros
- [ ] Textos da UI em PT-BR
- [ ] Responsivo (375px, 768px, 1280px)
- [ ] Sem `console.log` / código de debug
- [ ] Imports não usados removidos

### Testes obrigatórios por implementação (SDD)

Toda feature/implementação que passa pelo fluxo SDD **deve** ter as três camadas — e o E2E vale mais que os mocks (já pegou bug de regra de servidor que os unit não pegaram):

1. **Unitário** — lógica pura (libs, derivações, regras).
2. **Integração com MSW** — fetchers/queries contra o Supabase mockado (`src/test/msw/`).
3. **E2E de tela (Playwright)** — fluxo real no browser, **com prints de evidência em PNG**. As evidências ficam em `e2e/<feature>/evidencias/*.png` (gere rodando o spec; não invente prints).

## 9. Agentes disponíveis

Especialistas de domínio: `arq` (arquitetura, APIs e integrações), `front` (frontend, performance e segurança client-side), `back` (backend, integrações de futebol e Supabase), `pixel` (UX/UI design), `redteam` (segurança ofensiva e threat modeling).
Execução e qualidade: `bug` (QA/quality gate de código), `qa` (E2E em tela com Playwright), `scribe` (i18n PT-BR, docs).

Regra: **um agent por função, sem duplicação**.

## 10. Domínio: Bolão da Copa

- **Bolão**: grupo de palpites com regras de pontuação próprias
- **Participante**: o amigo que entra no bolão e faz palpites
- **Partida/Jogo**: confronto entre duas seleções, com data, fase e placar
- **Palpite**: aposta do participante no placar de uma partida
- **Pontuação** (mecânica oficial — fonte de verdade: `apurar_pontos()` no Supabase): vale o placar do tempo normal (90'), pênaltis não contam.
  - Base (`5/4/3/2/0`), depois **multiplicada pelo peso da fase** (`peso_fase()`):
    - `5` — cravou o placar de uma **vitória** (placar exato com vencedor)
    - `4` — cravou o placar de um **empate** (placar exato empatado)
    - `3` — acertou **quem ganhou**, placar errado
    - `2` — acertou que foi **empate**, placar errado
    - `0` — errou o resultado
  - **Multiplicador por fase**: grupos / 32-avos / 3º lugar = **×1**; oitavas / quartas = **×2**; semi / final = **×3**. Ex.: cravar a final vale `5×3 = 15`.
- **Ranking**: classificação dos participantes por pontos
- **Fases**: grupos → oitavas → quartas → semi → final
