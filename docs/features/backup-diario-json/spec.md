# Backup diário dos participantes em JSON — Design

**Data:** 2026-06-10
**Status:** aprovado

## Contexto e problema

O Bolão da Copa 2026 roda no Supabase free tier — sem PITR e sem backups
gerenciados. Se o projeto for pausado, corrompido ou perdido durante a Copa
(11/jun–19/jul/2026), os palpites e a pontuação dos participantes somem, e não
há como resolver disputas ("eu tinha cravado aquele placar!").

O app é uma SPA estática (Netlify, `output: "export"`) — não existe servidor
próprio para agendar um job. O backup precisa rodar fora do app, com custo zero.

## Objetivo

Snapshot **diário e automático** de todos os dados em **um JSON por dia**, que:

1. **Prova** — legível por humanos: ranking e palpites de cada participante
   naquele dia (resolve disputa entre amigos).
2. **Restaura** — fiel o suficiente para repovoar o banco, inclusive num
   projeto Supabase novo.

## Decisões (com o porquê)

| Decisão              | Escolha                                                                                              | Por quê                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Onde roda            | GitHub Actions (cron diário)                                                                         | Gratuito, automático, independente do Supabase                                          |
| Onde ficam os JSONs  | Repo privado [`emersonjds/backup-bolao-da-copa`](https://github.com/emersonjds/backup-bolao-da-copa) | O `bolao-copa` é **público**; o backup contém dados pessoais (nomes, e-mails, palpites) |
| Onde mora o código   | `bolao-copa/scripts/`                                                                                | Evolui junto com as migrations no mesmo PR; não contém secrets                          |
| Onde mora o workflow | Repo privado de backup                                                                               | Logs privados; commita em si mesmo com o `GITHUB_TOKEN` padrão (sem PAT)                |
| Ferramenta           | Script TypeScript (tsx) + `supabase-js`                                                              | Mesmo padrão dos scripts existentes; testável no Supabase local                         |
| Horário              | 03:00 BRT (06:00 UTC), diário                                                                        | Depois do último jogo do dia; captura o dia completo                                    |
| Escopo               | Backup **e** restauração                                                                             | Backup nunca testado na restauração é só esperança                                      |

## Arquitetura / fluxo diário

```
GitHub Actions (repo privado, cron 06:00 UTC + workflow_dispatch)
  1. checkout do próprio repo (backups/)
  2. checkout do bolao-copa público (scripts/)
  3. pnpm install + tsx scripts/backup.ts
       → fala com o Supabase prod via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
         (Actions secrets do repo privado)
  4. valida contagens → grava backups/YYYY-MM-DD.json
  5. git commit + push (GITHUB_TOKEN padrão)
```

- A **service_role** é necessária porque a RLS impede a publishable key de ler
  palpites de todos. Ela vive só como secret do Actions — **nunca** no frontend
  nem commitada (regra do CLAUDE.md preservada).
- Cada dia gera um **arquivo novo** — nunca há sobrescrita de backup anterior.

## Formato do JSON (`backups/YYYY-MM-DD.json`)

```json
{
  "gerado_em": "2026-06-10T06:00:12Z",
  "schema_version": "0019",
  "contagens": { "palpites": 312, "participantes": 14, "partidas": 104 },
  "ranking": [
    {
      "posicao": 1,
      "nome": "Fulano",
      "pontos": 42,
      "placares_cravados": 3,
      "resultados_certos": 9
    }
  ],
  "tabelas": {
    "profiles": [],
    "selecoes": [],
    "partidas": [],
    "boloes": [],
    "participantes": [],
    "convites": [],
    "palpites": []
  },
  "auth_users": [{ "id": "uuid", "email": "fulano@gmail.com" }]
}
```

- `ranking`: saída da RPC `get_ranking()` — a parte "prova entre amigos".
- `tabelas`: dump fiel (todas as colunas) das 7 tabelas de `public`.
- `auth_users`: extrato mínimo (id + e-mail) via Admin API. `profiles` não
  guarda e-mail; sem esse extrato não há como religar palpites aos donos num
  projeto novo.
- `schema_version`: número da última migration aplicada — na restauração,
  detecta backup incompatível com o schema atual.
- `contagens`: sanidade. O script **aborta sem gravar** se tabela essencial
  (`partidas`, `palpites`, `participantes`, `profiles`) vier vazia — falha
  barulhenta em vez de arquivar lixo.

## Restauração (`pnpm restore <arquivo.json>`)

Um script, dois cenários:

- **Mesmo projeto** (dados apagados/corrompidos, `auth.users` intacto):
  reinsere as tabelas `public` com os UUIDs originais.
- **Projeto novo** (projeto perdido): pré-requisito `supabase db push`
  (migrations). O script então:
  1. recria cada usuário via Admin API (`createUser` com `email_confirm`);
  2. monta o mapa `id antigo → id novo` casando pelo e-mail do `auth_users`
     do backup;
  3. insere as tabelas com os IDs remapeados (o trigger `handle_new_user`
     já cria `profiles` — o script faz upsert de nome/avatar por cima).
  4. Quando o participante logar com Google de novo, o Supabase religa a
     identidade pelo e-mail confirmado.

O script detecta o cenário sozinho: se os IDs do backup existem em
`auth.users`, é mesmo-projeto; senão, projeto-novo.

Guard anti-acidente: restauração em URL de prod exige flag explícita
(`--prod`) + confirmação digitada, no padrão dos guards existentes
(`scenario-e2e.ts`).

## Falhas e alertas

- Script falha (rede, key revogada, contagem zerada) → exit code ≠ 0 →
  workflow falha → GitHub notifica por e-mail (notificação padrão de
  workflow failure do dono do repo).
- Recuperação: re-run manual no Actions ou `workflow_dispatch`; o cron tenta
  de novo no dia seguinte. Perder um dia não perde histórico — o backup do
  dia seguinte contém tudo (snapshots são cumulativos por natureza).

## Testes (camada `test:db`, Supabase local)

- **Round-trip**: `scenario:seed` → backup → wipe das tabelas → restore →
  ranking e palpites idênticos ao original (compara JSON antes/depois).
- **Shape**: o JSON gerado valida contra schema Zod (zod já é dependência).
- **Guards**: contagem zerada aborta; URL de prod sem `--prod` aborta.

## Fora de escopo

- Backup de `auth.users` completo (senhas/identidades OAuth) — irrecuperável
  por design; o relink por e-mail cobre o caso real (todos usam Google).
- Storage/avatars — `avatar_url` aponta para o Google, não para o Supabase
  Storage.
- Retenção/limpeza — ~40 arquivos pequenos (KB); git versiona tudo, sem
  necessidade de expurgo.
- Criptografia dos JSONs — o repo privado é a fronteira de acesso aceita.
