<div align="center">

# ⚽ Bolão da Copa 2026

**Faça seus palpites na Copa do Mundo 2026 e dispute o ranking com os amigos**

</div>

---

## Quick start

```bash
git config --local core.hooksPath .githooks
pnpm install
pnpm dev
```

App em `http://localhost:3000`. Requer Node 20+.

## Stack

| Camada        | Tecnologia                                                         |
| ------------- | ------------------------------------------------------------------ |
| Framework     | Next.js 16 (App Router) + React 19                                 |
| Linguagem     | TypeScript                                                         |
| Estilização   | Tailwind CSS 4 + design tokens (`brand-*` verde-gramado, `gold-*`) |
| Estado client | Zustand 5                                                          |
| Data fetching | TanStack Query v5                                                  |
| Formulários   | React Hook Form 7 + Zod 4                                          |
| Mocks API     | MSW                                                                |
| Testes        | Vitest + Testing Library                                           |
| Hospedagem    | Cloudflare Workers static assets (static export)                   |

## Scripts

| Comando         | O que faz                                   |
| --------------- | ------------------------------------------- |
| `pnpm dev`      | Dev server em `:3000`                       |
| `pnpm build`    | Build estático (gera `out/`)                |
| `pnpm preview`  | Build + serve local via `wrangler dev`      |
| `pnpm deploy`   | Build + deploy no Cloudflare Workers        |
| `pnpm validate` | type-check + lint + format:check + test:run |

## Estrutura do monorepo

```
bolao-copa/
├── src/          ← Frontend (Next.js, Feature-Sliced Design) — ver abaixo
├── public/       ← Assets estáticos
└── supabase/     ← Backend (Supabase)
    ├── migrations/  ← db: schema SQL + RLS + triggers
    └── functions/   ← api: Edge Functions (apuração, sync de resultados)
```

Frontend e backend vivem no mesmo repositório. O frontend é estático
(Cloudflare); o backend é Supabase (Postgres + Auth + RLS + Edge Functions).
Detalhes do backend em [`supabase/README.md`](./supabase/README.md).

## Arquitetura do frontend — Feature-Sliced Design

```
src/
├── app/        ← Rotas e layouts (App Router). Sem regra de negócio.
├── widgets/    ← UI composta. Junta features + entities.
├── features/   ← Casos de uso (partidas, palpites, ranking).
├── entities/   ← Modelos de domínio (partida, palpite, participante).
└── shared/     ← Infra reutilizável (ui, lib, hooks, providers).
```

Import só de **layers abaixo**: `app → widgets → features → entities → shared`.

## Dados / API

Export estático, **sem backend embutido**. A camada de dados é o **MSW**, que
intercepta `/api/*` no browser (`src/mocks/handlers/`), **ligado por padrão em
dev e em produção** (`src/mocks/MockProvider.tsx`) — o deploy funciona de ponta
a ponta. Todo fetch passa por `apiUrl()` (`src/shared/lib/api-url.ts`).

**Virar para o backend real** quando existir — só configuração:

```bash
NEXT_PUBLIC_API_URL=https://api.bolaodacopa.app
NEXT_PUBLIC_ENABLE_MSW=false
```

## Status

Esqueleto inicial. Fluxo de exemplo funcionando: home lista os próximos jogos
via MSW → React Query. Demais funcionalidades (palpites, pontuação, ranking,
autenticação dos amigos) entram conforme as especificações.
