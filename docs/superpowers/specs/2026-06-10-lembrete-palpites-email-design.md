# Lembrete diário de palpites por e-mail — Design

**Data:** 2026-06-10
**Status:** aprovado

## Contexto e problema

O Bolão da Copa 2026 abre os palpites de cada jogo à **meia-noite (BRT) do dia
da partida** e trava **no apito** (`enforce_palpite_lock` / `janela_palpite_inicio`,
migration 0019). Durante a Copa (11/jun–19/jul/2026) há jogo quase todo dia — e
participante distraído **perde o palpite do dia** sem perceber, o que esvazia a
graça do bolão e gera frustração.

O app é uma SPA estática (Netlify, `output: "export"`) — não há servidor próprio
para agendar lembretes. Precisa rodar fora do app, com custo zero, igual ao backup.

## Objetivo

Um **lembrete automático por e-mail**, uma vez por dia, **só em dias com jogo** e
**só para quem ainda não palpitou** nos jogos daquele dia, levando a pessoa direto
para a tela de palpites antes do primeiro apito.

## Decisões (com o porquê)

| Decisão | Escolha | Por quê |
| --- | --- | --- |
| Canal | E-mail | Pedido do organizador; público é quase todo `@gmail` (entrega ótima) |
| Ferramenta de envio | SMTP do Gmail (`nodemailer`) de uma conta dedicada | Sem domínio próprio; grátis; 500 e-mails/dia (manda ~40); Gmail→Gmail quase nunca cai em spam |
| Remetente | `Resenha Bolão da Copa <resenhabolaodacopa@…>` | Identidade do bolão, separada do e-mail pessoal; respostas (opt-out) caem na caixa do bolão |
| Onde roda | GitHub Actions (cron diário) no repo privado `backup-bolao-da-copa` | Reaproveita o padrão e o segredo `service_role` do backup; logs e segredos fora do repo público |
| Onde mora o código | `bolao-copa/scripts/` | Evolui junto com as migrations; sem secrets no repo |
| Horário | 09:00 BRT (12:00 UTC), diário | Manhã do dia do jogo: janela já aberta (00:00 BRT) e folga até o apito |
| Alvo | Só quem falta ≥1 palpite nos jogos de hoje | Relevância máxima, zero spam para quem já completou |
| Dia sem jogo | Não envia nada | Evita fadiga e marcação como spam |
| Anti-duplicata | Tabela `lembretes_enviados (data, participante_id)` | Não reenvia para quem já recebeu hoje (protege re-run manual via `workflow_dispatch`) |
| Opt-out (v1) | Linha "responde este e-mail para parar" | Simples; resposta cai na caixa do bolão |

## Arquitetura / fluxo diário

```
GitHub Actions (repo privado backup-bolao-da-copa, cron 12:00 UTC + workflow_dispatch)
  └─ checkout do bolao-copa (app) → pnpm install → tsx scripts/notificar.ts
       │  secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GMAIL_USER, GMAIL_APP_PASSWORD
       ▼
   notificar.ts (I/O)
     1. lê hoje (BRT) e os dados via supabase-js (service_role):
        - partidas de hoje (status 'agendada')
        - palpites dessas partidas
        - participantes + e-mails (auth.admin.listUsers)
        - já-enviados de hoje (tabela lembretes_enviados)
     2. notificar-core.ts (puro) calcula as PENDÊNCIAS:
        para cada participante, jogos de hoje sem palpite → quem tem ≥1
     3. para cada pendência ainda-não-enviada:
        - email-template.ts monta o HTML (PT-BR, verde, lista + prazo + botão)
        - envia via SMTP do Gmail (nodemailer)
        - grava em lembretes_enviados (data, participante_id)
     4. loga o resumo (enviados / pulados / falhas)
```

## Componentes (cada um com um propósito, testável isolado)

| Arquivo | Responsabilidade | Depende de |
| --- | --- | --- |
| `scripts/lib/notificar-core.ts` (novo) | **Puro**: `jogosDeHoje(partidas, agora)`, `pendencias(participantes, jogosHoje, palpites, emails)`, `prazoDoDia(jogosHoje)` | só dos tipos |
| `scripts/lib/email-template.ts` (novo) | **Puro**: `renderLembrete({nome, jogos, prazo, appUrl})` → `{ assunto, html, texto }` (PT-BR, verde) | nada |
| `scripts/notificar.ts` (novo) | **I/O**: env, Supabase, SMTP, grava log; orquestra os puros | `env.ts`, `supabase-js`, `nodemailer` |
| `scripts/lib/notificar-core.test.ts` (novo) | Testes do core (borda de fuso, faltantes, dia sem jogo) | — |
| `scripts/lib/email-template.test.ts` (novo) | Testes do template (nome, jogos, prazo, CTA, opt-out) | — |
| `supabase/migrations/0020_lembretes_enviados.sql` (novo) | Tabela anti-duplicata + RLS + grant ao `service_role` | — |
| Repo backup: `.github/workflows/lembrete.yml` (novo) | Cron 12:00 UTC + `workflow_dispatch` | secrets |

**Por que o core é puro:** "jogo é de hoje?" e "quem falta palpitar?" são as regras
que mais merecem teste (borda de fuso, completo vs. faltante) e não devem precisar
de banco nem de SMTP para rodar — exatamente o padrão do `backup-core`.

## Modelo de dados

```sql
-- Anti-duplicata: 1 lembrete por participante por dia. Escrita só pelo service_role.
create table public.lembretes_enviados (
  data            date not null,
  participante_id uuid not null references public.participantes (id) on delete cascade,
  enviado_em      timestamptz not null default now(),
  primary key (data, participante_id)
);

alter table public.lembretes_enviados enable row level security;
-- sem policy para anon/authenticated → invisível ao app (publishable key);
-- o service_role ignora RLS. Grant defensivo (padrão dos consertos 0008-0010):
grant select, insert on public.lembretes_enviados to service_role;
```

## "Jogo de hoje" (regra de fuso)

`hoje` = `dataBrtHoje(agora)` (reaproveita o helper do backup — `America/Sao_Paulo`,
`YYYY-MM-DD`). Um jogo é **de hoje** quando a data BRT do seu `data_hora` é igual a
`hoje` **e** `status = 'agendada'`. Ex.: `data_hora = 2026-06-26T02:00:00Z` é
**23:00 BRT de 25/06** → conta como dia 25, não 26. O `prazo` exibido no e-mail é o
**apito mais cedo** entre os jogos de hoje (o primeiro a travar).

## Conteúdo do e-mail

- **Assunto:** `⚽ Bolão: você tem N palpite(s) para hoje`
- **Corpo (HTML PT-BR, verde do app):** saudação pelo nome; "Os palpites de hoje
  já estão abertos — você ainda não palpitou em N jogo(s):"; **lista** dos jogos
  faltantes (`Seleção A × Seleção B — HH:MM`); **botão** "Fazer meus palpites" →
  `https://resenha-bolao-da-copa.netlify.app/palpites`; aviso de prazo
  ("⏰ o primeiro jogo trava às HH:MM"); rodapé com opt-out ("Não quer mais estes
  lembretes? Responde este e-mail."). Também uma versão **texto puro** (entrega).

## Tratamento de erros

- **Dia sem jogo** → loga "sem jogos hoje" e sai `0` (não envia).
- **Participante sem e-mail** → pula e loga (não derruba o lote).
- **Falha de SMTP num destinatário** → loga e **continua** os demais; só grava em
  `lembretes_enviados` quem foi enviado de fato (re-run reenvia só os que faltaram).
- **Env/secret ausente** → sai `1` com mensagem clara.
- **Anti-prod não se aplica** (operação é só leitura + envio; não altera dados do bolão).

## Testes

- `notificar-core.test.ts`: `jogosDeHoje` (inclui borda de fuso e filtro de status),
  `pendencias` (quem completou não entra; quem falta entra com a lista certa; sem
  e-mail é pulado), `prazoDoDia` (pega o apito mais cedo), **dia sem jogo → vazio**.
- `email-template.test.ts`: o HTML contém nome, cada jogo faltante, o horário-prazo,
  o link de `/palpites` e a linha de opt-out.
- SMTP **fakeado** (injeta a função de envio) — nenhum e-mail real nos testes.
- Cobertura roda no vitest principal (`scripts/**`), sem afetar o threshold de `src/**`.

## Fora do escopo (fase 2, se houver demanda)

- "Última chamada" 2h antes do primeiro apito (só para quem ainda falta).
- Coluna `recebe_lembrete` em `profiles` para opt-out persistente (v1 é manual).
- Templates com React Email; troca de canal/banco (WhatsApp).

## Passos manuais do organizador (depois da implementação)

1. **Secrets** no repo `backup-bolao-da-copa` (Settings → Secrets → Actions):
   `GMAIL_USER` (`resenhabolaodacopa@…`) e `GMAIL_APP_PASSWORD` (as 16 letras da
   Senha de app). `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem.
2. **Aplicar a migration** em prod: `supabase db push` (cria `lembretes_enviados`).
3. **Push** dos dois repos e **Run workflow** uma vez para validar o primeiro envio.
