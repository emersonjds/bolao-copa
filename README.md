<div align="center">

# ⚽ Bolão da Copa 2026

**Palpites da Copa do Mundo 2026 pra disputar o ranking com os amigos.**

<p align="center">
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3ecf8e?logo=supabase&logoColor=white" />
  <img alt="Cobertura 100%" src="https://img.shields.io/badge/cobertura-100%25%20linhas-brightgreen" />
  <img alt="Licença MIT" src="https://img.shields.io/badge/license-MIT-green" />
</p>

</div>

---

SPA estática (Next.js, `output: "export"`) que fala **direto com o Supabase** (Postgres + RLS + Auth Google). UI 100% em PT-BR. Deploy estático no Netlify.

## Rodar localmente (via Docker)

Pré-requisitos: **Node 20+**, **pnpm 10**, **Docker** (para o Supabase local) e a **CLI do Supabase**.

```bash
pnpm install
supabase start                 # sobe Postgres + APIs do Supabase no Docker (aplica migrations + seed.sql)
cp .env.test.example .env.test # preencha com os valores de `supabase status`
pnpm scenario:seed             # popula um cenário de teste (5 contas, todas as fases)
pnpm dev:local                 # app em http://localhost:3000 apontando pro Supabase LOCAL
```

- **Login em dev:** o login real é Google OAuth (não roda no local). Na aba **Palpites**, use o botão **"Logar em dev"** (só aparece em desenvolvimento) e escolha uma conta de teste — senha `Senha-Demo-2026!`.
- **Inspecionar o banco:** Supabase Studio em `http://127.0.0.1:54323`, ou DBeaver/psql em `127.0.0.1:54322` (db/user/pass = `postgres`).
- `pnpm dev` (sem `:local`) usa o Supabase de **produção** (`.env.local`); use `pnpm dev:local` para o banco local.

## Testes

Três camadas, todas verdes:

| Camada            | Comando         | Cobre                                                     |
| ----------------- | --------------- | -------------------------------------------------------- |
| Unit / integração | `pnpm test:run` | componentes, hooks e fetchers (mocks via MSW)            |
| Banco             | `pnpm test:db`  | regra de pontos, RLS/grants e desempate (Postgres local) |
| E2E               | `pnpm test:e2e` | telas fase a fase, ranking, palpitar (Playwright)        |

```bash
pnpm test:coverage   # cobertura: 100% linhas e funções
```

`test:db` e `test:e2e` exigem `supabase start` + `pnpm scenario:seed` rodados antes.

## Scripts

| Comando              | O que faz                                   |
| -------------------- | ------------------------------------------- |
| `pnpm dev:local`     | Dev server apontando pro Supabase local     |
| `pnpm build`         | Build estático (gera `out/`)                |
| `pnpm validate`      | type-check + lint + format:check + test:run |
| `pnpm scenario:seed` | (Re)cria o cenário de teste no banco local  |
| `pnpm scenario:open` | Abre um Chrome já logado numa conta de teste|

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · TanStack Query v5 · React Hook Form + Zod · Supabase (Postgres + RLS + Auth) · Vitest + Testing Library + MSW · Playwright · Netlify.

## Arquitetura

Feature-Sliced Design — import só de camadas abaixo:

```
src/  app → widgets → features → entities → shared
```

Backend é Supabase: schema/RLS/RPCs versionados em `supabase/migrations/`.

## Documentação

- **`docs/PROJETO.md`** — handbook (visão geral, regras de pontuação, ambientes, testes, estado atual). **Leia primeiro.**
- `docs/README.md` — índice de toda a documentação.
- `docs/audits/` — auditorias de segurança e performance.
- `CLAUDE.md` — regras de desenvolvimento do projeto.

## Deploy

Netlify estático: build `pnpm build`, publish `out/`. Security/cache headers em `public/_headers`.

## Licença

MIT — ver [LICENSE](LICENSE).
