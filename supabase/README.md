# Supabase — backend do Bolão da Copa

Backend do projeto: **Postgres + Auth + RLS + Edge Functions**. Esta pasta é o
lado "servidor" do monorepo.

| Pasta         | Papel                                                                                        | Equivale a |
| ------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `migrations/` | Schema SQL versionado (tabelas, RLS, functions, triggers)                                    | **db**     |
| `functions/`  | Edge Functions (Deno) — lógica server-authoritative (apuração de pontos, sync de resultados) | **api**    |
| `config.toml` | Config do projeto Supabase (criado por `supabase init`)                                      | —          |
| `seed.sql`    | Dados de seed para dev (seleções, calendário)                                                | —          |

## Setup (uma vez)

```bash
# Instale a CLI: https://supabase.com/docs/guides/cli
supabase init          # cria config.toml
supabase link --project-ref <REF>   # vincula ao projeto na nuvem
supabase db push       # aplica as migrations
```

## Regras de ouro

- **Server é fonte de verdade**: `palpite.pontos` e a trava de horário do palpite
  são decididos no banco (RLS + triggers), nunca no cliente.
- **RLS default-deny** em todas as tabelas. Policies sempre comparam contra
  `auth.uid()`.
- **Segredos nunca commitados**: `service_role key`, senhas e URLs com credencial
  ficam em `.env.local` / `supabase/.env` (ambos no `.gitignore`). Só a `anon key`
  pública vai pro frontend via `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
