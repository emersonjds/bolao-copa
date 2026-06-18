# Bolão da Copa 2026 Verification Report

**Scope:** Todos os controles aplicados no registro de hardening. Provas: leitura do código/SQL aplicado, suíte de banco (`test:db`) e unit/MSW (`test:run`) no Supabase local, `pnpm audit --prod`, build de produção (`out/`), e confirmação de que as migrations 0023–0027 constam como aplicadas no remoto (`migration list --linked`).
**Verified:** 2026-06-18

## Verdicts

### `eh_admin(uuid)` permite enumerar contas admin

**Result:** ✅ Risk closed
**How proven:** Li a migration 0023: a sobrecarga `eh_admin(uuid)` é dropada e só resta `eh_admin()` sem argumento (checa `auth.uid()`), com a policy `partidas_update_admin` recriada sobre ela. O teste de banco de regressão confirma que `select public.eh_admin($uuid)` agora falha com "does not exist", e o teste do contrato novo passa. Remoto mostra 0023 aplicada.
**Evidence:** `eh_admin()` sem parâmetro grantada a authenticated; chamada com uuid rejeitada; app usa `rpc("eh_admin")` sem argumento.

### Sem CHECK de range para gols (palpites e partidas)

**Result:** ✅ Risk closed
**How proven:** Migration 0024 adiciona CHECK (0..99) em `palpites` e `partidas`. Testes de banco confirmam rejeição de gol negativo no palpite e de placar absurdo no resultado. O push em prod aplicou 0024 sem erro — prova de que os dados existentes já respeitam o range.
**Evidence:** Constraints `palpites_gols_validos` e `partidas_gols_validos` presentes; inserts inválidos rejeitados pelo banco.

### Ranking conta pontos de partida revertida para não-encerrada

**Result:** ✅ Risk closed
**How proven:** Migration 0025 recria `get_ranking()` somando/contando pontos só quando `pt.id is not null` (partida encerrada). Teste de banco apura, reverte o status para ao-vivo e confirma que o total cai de 5 para 0. Remoto com 0025 aplicada.
**Evidence:** Agregados de `get_ranking()` com `filter (where pt.id is not null)`.

### `updated_at` de palpite falsificável pelo cliente

**Result:** ✅ Risk closed
**How proven:** Migration 0026 revoga o UPDATE de `palpites` e reconcede só nas colunas de gols. Teste de banco via `has_column_privilege` confirma `gols_mandante`=true e `updated_at`=false para authenticated. Remoto com 0026 aplicada.
**Evidence:** GRANT de UPDATE de authenticated limitado a `gols_mandante, gols_visitante`.

### Funções de janela do palpite sem `search_path` fixo

**Result:** ✅ Risk closed
**How proven:** Migration 0027 recria `janela_palpite_inicio` e `janela_inicio` com `set search_path = public, pg_temp`. Replay local sem erro e remoto com 0027 aplicada.
**Evidence:** Cláusula `set search_path` presente nas duas funções.

### `connect-src` da CSP usa wildcard `*.supabase.co`

**Result:** ✅ Risk closed
**How proven:** Li o `out/_headers` gerado pelo build: a diretiva `connect-src` aponta para `https://gbspiwzdqkbhkckdaajz.supabase.co` e `wss://...` (sem wildcard na diretiva). O único `*.supabase.co` restante é texto de comentário.
**Evidence:** Diretiva CSP fixada no host do projeto no header do deploy.

### `nodemailer` com CVE de SSRF/leitura de arquivo local

**Result:** ✅ Risk closed
**How proven:** `package.json` em `^9.0.1` e `pnpm audit --prod` retorna "No known vulnerabilities found".
**Evidence:** Dependência atualizada; audit de produção limpo.

### `postcss` transitivo com CVE de XSS de build-time

**Result:** ✅ Risk closed
**How proven:** `pnpm.overrides` força `postcss >= 8.5.10`; audit de produção limpo; build de produção concluído sem erro.
**Evidence:** Override no `package.json`; sem postcss vulnerável na árvore de produção.

### `SENHA_DEV` hardcoded em escopo de módulo (pode vazar no bundle)

**Result:** ✅ Risk closed
**How proven:** Após o build, `grep` por `Senha-Demo-2026`/`SENHA_DEV` em `out/` não retorna nada — a string não entra no bundle de produção.
**Evidence:** Senha movida para dentro do guard de `NODE_ENV`; ausente do `out/`.

### Chave publishable local hardcoded no `package.json`

**Result:** ✅ Risk closed
**How proven:** Li o `package.json`: `dev:local` é apenas `next dev`, sem URL/chave inline. O local continua funcionando via `.env.development.local` (gitignored).
**Evidence:** Script `dev:local` sem credencial embutida.

### MCP `serena` instalado sem pin de commit (supply chain de dev)

**Result:** ✅ Risk closed
**How proven:** Li o `.mcp.json`: a referência do `serena` é `git+https://github.com/oraios/serena@v1.5.3` (tag fixa).
**Evidence:** Servidor MCP pinado em tag.

### Sem scanning de dependências no CI

**Result:** ✅ Risk closed
**How proven:** Li o workflow novo: roda `pnpm audit --prod --audit-level high` em push para master e em PRs, falhando em High/Critical de produção.
**Evidence:** Workflow de segurança presente em `.github/workflows/`.

## Applied sub-skills

- browser: informou os veredictos de "`connect-src` da CSP usa wildcard" (host fixado), "`SENHA_DEV` ... bundle" (ausente do `out/`) e o gate de input do CHECK de gols. As ameaças residuais de browser (CSP `unsafe-inline`, cookie não-HttpOnly) seguem em "Not yet holding" como limitações arquiteturais aceitas.

## Not yet holding

- **CSP permite `script-src 'unsafe-inline'`** (Blocked, charter I): não removível sem quebrar a hidratação do static export do Next. Mitigado por `connect-src` fixado + headers fortes + ausência de sinks de XSS. Reabrir se houver camada server-side com nonce.
- **Tokens de sessão em cookie acessível a JavaScript** (Blocked, charter I/VII): limitação arquitetural do static export. Mitigado pela CSP/headers. Reabrir com proxy de auth server-side.
- **`undici` transitivo com CVE (apenas dev/test)** (Accepted, charter I): não está na árvore de produção (audit `--prod` limpo); o override quebra o jsdom dos testes. Aguardando versão compatível; coberto pelo novo CI de audit.
- **Acesso ao bolão sem convite** (Declined por decisão do dono, charter VI): signup aberto é intencional na validação privada (exceção registrada no charter). Fechar com token de convite após a validação.
