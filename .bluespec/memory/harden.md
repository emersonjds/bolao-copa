# Bolão da Copa 2026 Hardening Record

**Scope:** Todos os fixes do plano, exceto "Acesso ao bolão sem convite" (decisão do dono: signup aberto é intencional na fase de validação privada). Migrations validadas no Supabase local (db reset + test:db).
**Hardened:** 2026-06-18

## Applied

### `eh_admin(uuid)` permite enumerar contas admin

**Status:** Applied
**What changed:** A função exposta ao cliente deixou de aceitar um UUID externo. A sobrecarga `eh_admin(uuid)` foi removida e criada `eh_admin()` sem argumento, que checa apenas o próprio `auth.uid()`. A policy de update de partidas foi recriada usando a nova função. Ninguém mais consegue perguntar "fulano é admin?" sobre outra conta.
**Where:** Migration de hardening do `eh_admin` (recria policy `partidas_update_admin`); teste de banco atualizado para o novo contrato + teste de regressão garantindo que a versão com uuid não existe mais.

### Sem CHECK de range para gols (palpites e partidas)

**Status:** Applied
**What changed:** Constraints `CHECK` adicionadas no servidor para gols de `palpites` e `partidas` (entre 0 e 99), fechando o bypass via API direta/localStorage. A UI segue em 0–20.
**Where:** Migration de CHECK de gols; testes de banco cobrindo gol negativo no palpite e placar absurdo no resultado.

### Ranking conta pontos de partida revertida para não-encerrada

**Status:** Applied
**What changed:** `get_ranking()` passou a somar e contar pontos apenas de palpites cuja partida está de fato encerrada (gate por `pt.id` no agregado, igual ao desempate). Reverter o status de uma partida deixa de inflar o total.
**Where:** Migration que recria `get_ranking()`; teste de banco que apura, reverte o status e confirma que os pontos saem do ranking.

### `updated_at` de palpite falsificável pelo cliente

**Status:** Applied
**What changed:** A coluna `updated_at` foi removida do GRANT de UPDATE de `palpites` para `authenticated`. O cliente só escreve os gols; o trigger é a única fonte do timestamp. Não dá mais pra forjar a trilha de auditoria.
**Where:** Migration que revoga e re-concede o UPDATE só nas colunas de gols; teste de banco via `has_column_privilege`.

### Funções de janela do palpite sem `search_path` fixo

**Status:** Applied
**What changed:** `janela_palpite_inicio()` e `janela_inicio()` recriadas com `set search_path = public, pg_temp`, alinhando ao hardening das demais funções.
**Where:** Migration que recria as duas funções de janela (grants preservados pelo create or replace).

### `connect-src` da CSP usa wildcard `*.supabase.co`

**Status:** Applied
**What changed:** O `connect-src` da CSP foi fixado no host concreto do projeto Supabase deste bolão (REST + WebSocket), em vez do wildcard. Reduz a superfície de exfiltração autorizada num cenário de XSS.
**Where:** Arquivo de headers do deploy estático (comentário atualizado avisando para trocar o ref se mudar de projeto).

### `nodemailer` com CVE de SSRF/leitura de arquivo local

**Status:** Applied
**What changed:** `nodemailer` atualizado de `^8.0.11` para `^9.0.1` (corrige GHSA-p6gq-j5cr-w38f). `pnpm audit --prod` ficou limpo.
**Where:** Dependência no `package.json` + lockfile.

### `postcss` transitivo com CVE de XSS de build-time

**Status:** Applied
**What changed:** Adicionado `pnpm.overrides` forçando `postcss >= 8.5.10`, deduplicando a versão antiga que o Next trazia transitivamente (GHSA-qx2v-qp2m-jg93).
**Where:** Campo `pnpm.overrides` no `package.json` + lockfile.

### `SENHA_DEV` hardcoded em escopo de módulo (pode vazar no bundle)

**Status:** Applied
**What changed:** A senha do cenário local foi movida para dentro do componente, depois do guard de `NODE_ENV`, de modo que fica em código morto e o DCE a remove do bundle de produção (confirmado: a string não aparece em `out/`).
**Where:** Componente de login de desenvolvimento.

### Chave publishable local hardcoded no `package.json`

**Status:** Applied
**What changed:** O script `dev:local` deixou de embutir a URL/chave do Supabase local inline (já redundante: `.env.development.local`, gitignored, já força qualquer `pnpm dev` para o local). O script agora é apenas `next dev`.
**Where:** Script `dev:local` no `package.json`.

### MCP `serena` instalado sem pin de commit (supply chain de dev)

**Status:** Applied
**What changed:** A referência do servidor MCP `serena` foi fixada na tag `v1.5.3` em vez do branch padrão, evitando puxar código não revisado na próxima execução.
**Where:** Entrada do `serena` no `.mcp.json`.

### Sem scanning de dependências no CI

**Status:** Applied
**What changed:** Adicionado workflow de CI que roda `pnpm audit --prod --audit-level high` em push para master e em PRs, barrando vulnerabilidades High/Critical de produção.
**Where:** Novo workflow de segurança em `.github/workflows/`.

## Remaining

- **CSP permite `script-src 'unsafe-inline'`** (Blocked): o static export do Next emite scripts inline de bootstrap/hidratação (confirmado em `out/*.html`); remover `'unsafe-inline'` quebraria a hidratação, e hashes por build seriam frágeis. Mitigado pelos demais controles (sem sinks de XSS no código, `connect-src` agora fixado, headers fortes). Reavaliar se surgir uma camada server-side (Edge Function) capaz de emitir nonce.
- **Tokens de sessão em cookie acessível a JavaScript (não-HttpOnly)** (Blocked): limitação arquitetural do static export (sem servidor não há cookie `HttpOnly`). Mitigado por CSP + headers; reavaliar com proxy de auth server-side no futuro.
- **`undici` transitivo com CVE (apenas dev/test)** (Accepted): forçar o override quebra o `jsdom` do ambiente de teste; o `undici` não está na árvore de produção (`pnpm audit --prod` limpo). Aceito como risco-zero-de-produção e coberto pelo novo CI de audit de dev quando houver patch compatível.
- **Acesso ao bolão sem convite (signup aberto + auto-inscrição + RLS de self-insert)** (Declined nesta passada): decisão do dono — signup aberto é intencional na fase de validação privada. Fechar (exigir token de convite) fica para depois da validação. Registrado como exceção aceita no charter.
