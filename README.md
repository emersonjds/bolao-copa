<div align="center">

# ⚽ Bolão da Copa 2026

**Faça seus palpites na Copa do Mundo 2026 e dispute o ranking com os amigos**

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript 6" src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" />
  <img alt="Vitest 4" src="https://img.shields.io/badge/Vitest-4-6e9f18?logo=vitest&logoColor=white" />
  <img alt="Cobertura 4.12%" src="https://img.shields.io/badge/cobertura-4.12%25-red" />
  <img alt="MSW 2" src="https://img.shields.io/badge/MSW-2-ff6a33?logo=mockserviceworker&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase&logoColor=white" />
  <img alt="Netlify" src="https://img.shields.io/badge/Netlify-deploy-00c7b7?logo=netlify&logoColor=white" />
  <img alt="pnpm 10" src="https://img.shields.io/badge/pnpm-10-f69220?logo=pnpm&logoColor=white" />
  <img alt="Licença MIT" src="https://img.shields.io/badge/license-MIT-green" />
</p>

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
| Hospedagem    | Netlify (static export — publish `out/`)                           |

## Qualidade

| Verificação       | Comando              | Status local                     |
| ----------------- | -------------------- | -------------------------------- |
| TypeScript        | `pnpm type-check`    | Incluso em `pnpm validate`       |
| Lint              | `pnpm lint`          | Incluso em `pnpm validate`       |
| Formatação        | `pnpm format:check`  | Incluso em `pnpm validate`       |
| Testes            | `pnpm test:run`      | Incluso em `pnpm validate`       |
| Cobertura         | `pnpm test:coverage` | 4.12% linhas / 4.07% statements  |
| Varredura secrets | `rg` em arquivos Git | Sem segredos reais identificados |

A cobertura acima reflete a última execução local de `pnpm test:coverage` em
2026-06-05. O projeto ainda está em fase inicial; novas features devem incluir
testes próximos ao slice alterado.

## Segurança e variáveis de ambiente

- Não commitar `.env`, `.env.*`, `.dev.vars`, chaves privadas, tokens ou arquivos
  locais do Supabase/Netlify.
- Use `.env.local.example` como referência de nomes públicos e placeholders.
- Variáveis `NEXT_PUBLIC_*` ficam expostas no bundle do frontend; use somente
  valores públicos nelas.
- Segredos de backend devem ficar no painel do Supabase, nas variáveis de
  ambiente do Netlify ou em arquivos locais ignorados pelo Git.
- Antes de abrir PR, rode `pnpm validate` e uma busca por termos sensíveis nos
  arquivos versionados.

## Scripts

| Comando         | O que faz                                   |
| --------------- | ------------------------------------------- |
| `pnpm dev`      | Dev server em `:3000`                       |
| `pnpm build`    | Build estático (gera `out/`)                |
| `pnpm validate` | type-check + lint + format:check + test:run |

O deploy no Netlify usa a pasta `out/` como _publish directory_ (arraste a
pasta no painel do Netlify, ou configure build command `pnpm build` + publish
`out`).

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
(Netlify); o backend é Supabase (Postgres + Auth + RLS + Edge Functions).
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

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE) para mais detalhes.
