# Bolão da Copa 2026 Defense Plan

**Scope:** Todos os findings do detect map.
**Planned:** 2026-06-18

## Fixes

### `eh_admin(uuid)` permite enumerar contas admin

**Priority:** High
**Upholds:** VII. Dados pessoais dos participantes ficam restritos a quem precisa, VI. Funções do banco rodam com privilégio mínimo
**Fix:** Remover o parâmetro livre do caminho exposto ao cliente. Manter `eh_admin()` (sem argumento, usando `auth.uid()` internamente) para o uso legítimo do app, e revogar de `authenticated` o execute da sobrecarga que aceita `uid uuid` arbitrário (ou movê-la para uso interno de outras funções `SECURITY DEFINER` apenas). Assim ninguém consegue perguntar "fulano é admin?" sobre outra conta.

### Acesso ao bolão sem convite (signup aberto + auto-inscrição + RLS de self-insert)

**Priority:** High
**Upholds:** VI. Funções do banco rodam com privilégio mínimo, II. A RLS do Postgres é a fronteira de autorização, V. Todo input externo é não confiável até validado no servidor
**Fix:** Decisão de produto primeiro (ver Open questions): se o bolão deve ser fechado, exigir token de convite válido para entrar. Concretamente: trocar a auto-inscrição no `handle_new_user` por um fluxo que só vincula o usuário a um bolão mediante um convite válido e não usado da tabela `convites`; e endurecer a policy `participantes_insert_self` para exigir, no `WITH CHECK`, que exista um convite válido para aquele `bolao_id` (ou mover a inscrição para uma RPC `SECURITY DEFINER` que valide e consuma o token). Se o signup aberto for intencional na fase de validação, registrar a decisão e baixar a prioridade.

### Sem CHECK de range para gols (palpites e partidas)

**Priority:** Medium
**Upholds:** V. Todo input externo é não confiável até validado no servidor
**Fix:** Adicionar constraints `CHECK` no banco para os gols de `palpites` e `partidas` (ex.: `>= 0 AND <= 99`, mantendo a UI em 0–20), via nova migration. A validação passa a existir na boundary de escrita do servidor, não só no clamp do cliente — fecha o bypass via `localStorage`/API direta.

### CSP permite `script-src 'unsafe-inline'`

**Priority:** Medium
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Reduzir o `unsafe-inline` no `script-src` ao mínimo. Static export do Next não permite nonce por request, mas dá para (a) confirmar se há realmente scripts inline necessários e, se não, remover `'unsafe-inline'` de `script-src`; ou (b) migrar para hashes (`'sha256-...'`) dos poucos scripts inline gerados pelo Next. Documentar o que sobrar como tradeoff explícito.

### `connect-src` da CSP usa wildcard `*.supabase.co`

**Priority:** Medium
**Upholds:** VII. Dados pessoais dos participantes ficam restritos a quem precisa
**Fix:** Fixar o `connect-src` no host concreto do projeto (`https://<project-ref>.supabase.co` e `wss://<project-ref>.supabase.co`), gerado no build a partir de `NEXT_PUBLIC_SUPABASE_URL`, em vez do wildcard. Reduz a superfície de exfiltração autorizada num cenário de XSS.

### Tokens de sessão em cookie acessível a JavaScript (não-HttpOnly)

**Priority:** Medium
**Upholds:** I. Segredos nunca vivem no código nem no histórico, VII. Dados pessoais dos participantes ficam restritos a quem precisa
**Fix:** Não é eliminável no static export puro (sem servidor não há cookie `HttpOnly`). Mitigar pela defesa em profundidade: fechar o `unsafe-inline` da CSP (fix acima), manter `auto-refresh`/expiração curta de sessão, e registrar a limitação. Se um dia houver uma camada server-side (Netlify Edge Function de proxy de auth), reavaliar para mover o token para cookie `HttpOnly`.

### `nodemailer` com CVE de SSRF/leitura de arquivo local

**Priority:** Medium
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Atualizar `nodemailer` para `>= 9.0.1` no `package.json` e no lockfile, e rodar a suíte do script de notificação para confirmar que o envio continua funcionando.

### Ranking conta pontos de partida revertida para não-encerrada

**Priority:** Medium
**Upholds:** III. A apuração e a pontuação são verdade do servidor
**Fix:** Em `get_ranking()`, condicionar a soma de pontos a partidas encerradas — somar `pi.pontos` apenas quando a partida correspondente está `encerrada` (mover o filtro de status para dentro do agregado, alinhando com o que o desempate já faz). Alternativa/complemento: zerar `palpites.pontos` quando uma partida sai de `encerrada` (trigger na reversão de status). Nova migration.

### `postcss` transitivo com CVE de XSS de build-time

**Priority:** Low
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Forçar `postcss >= 8.5.10` via `pnpm.overrides` no `package.json` (ou atualizar o Next quando houver versão que já traga o patch), e rebuildar para confirmar que o export estático continua íntegro.

### `updated_at` de palpite falsificável pelo cliente

**Priority:** Low
**Upholds:** V. Todo input externo é não confiável até validado no servidor
**Fix:** Tirar `updated_at` do GRANT de UPDATE de `palpites` para `authenticated` e deixar o trigger ser a única fonte do timestamp; ou fazer o trigger setar `new.updated_at = now()` em todo UPDATE (não só quando os gols mudam). Nova migration. Preserva a trilha de auditoria.

### Funções de janela do palpite sem `search_path` fixo

**Priority:** Low
**Upholds:** VI. Funções do banco rodam com privilégio mínimo
**Fix:** Recriar `janela_palpite_inicio()` e `janela_inicio()` com `set search_path = public, pg_temp`, alinhando ao hardening já aplicado às demais funções. Nova migration.

### `SENHA_DEV` hardcoded em escopo de módulo (pode vazar no bundle)

**Priority:** Low
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Ler a senha de dev de uma env de desenvolvimento (ex.: `NEXT_PUBLIC_DEV_LOGIN_PASSWORD`) em vez de constante literal, ou mover para dentro do guard de `NODE_ENV` de forma que a string não exista no bundle de produção. Confirmar com grep no `out/` que a string sumiu.

### Chave publishable local hardcoded no `package.json`

**Priority:** Low
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Mover a env inline do script `dev:local` para um arquivo `.env.development.local` (já não versionado) e deixar o script só rodar `next dev`. Evita o padrão de chave embutida em arquivo versionado.

### MCP `serena` instalado sem pin de commit (supply chain de dev)

**Priority:** Low
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Fixar a referência do `serena` no `.mcp.json` a um commit/tag específico em vez do branch padrão, e atualizar conscientemente. Reduz o risco de puxar código comprometido na próxima execução.

### Sem scanning de dependências no CI

**Priority:** Low
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Adicionar um passo de auditoria de dependências (GitHub Action com `pnpm audit --prod` e/ou Dependabot/OSV-Scanner) que rode em PRs, falhando em vulnerabilidades High/Critical de produção.

### `undici` transitivo com CVE (apenas dev/test)

**Priority:** Low
**Upholds:** I. Segredos nunca vivem no código nem no histórico
**Fix:** Forçar `undici >= 7.28.0` via `pnpm.overrides`, ou aceitar como risco-zero-de-produção e apenas registrar (é só dev/test). Decidir junto com o fix de scanning de CI.

## Open questions

- **Signup aberto é intencional na fase de validação privada?** O produto está com testers reais no banco de produção. Se a entrada por link público + auto-inscrição é desejada agora, o fix de "Acesso ao bolão sem convite" muda de natureza (vira "fechar depois da validação") e a prioridade cai. Precisa da decisão do dono antes do harden.
- **Aplicação das migrations de hardening no banco:** há testers reais em produção. Qualquer migration nova (CHECK de gols, ranking, search_path, updated_at) deve ser aplicada com cuidado (sem `db reset --linked`), validada localmente primeiro. Definir o caminho de deploy do banco antes do harden.
