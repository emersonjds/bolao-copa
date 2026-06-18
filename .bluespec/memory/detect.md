# Bolão da Copa 2026 Detect Map

**Scope:** Varredura completa do projeto (frontend `src/`, Supabase `supabase/migrations/` + `functions/`, config de deploy, dependências e tooling), feita por três detectores em paralelo (superfície de ataque geral, client-side, backend/Postgres).
**Mapped:** 2026-06-18

## Findings

### Acesso ao bolão sem convite (signup aberto + auto-inscrição + RLS de self-insert)

**What it is:** O cadastro está aberto (`enable_signup = true`, sem allow-list de domínio) e um trigger inscreve automaticamente todo novo usuário no bolão padrão. No banco, a policy de INSERT em `participantes` só checa que o usuário é ele mesmo — não exige token de convite válido. A tabela `convites` existe, mas nenhuma RPC/policy a valida antes de aceitar a inscrição.
**Why it matters:** É um bolão entre amigos com prêmio em dinheiro. Hoje qualquer pessoa com conta Google que abra o link público entra no ranking e palpita sem aprovação. Quando existirem múltiplos bolões (alguns privados), o `bolao_id` é trivialmente conhecido (hardcoded nas migrations) e qualquer autenticado se auto-inscreve em qualquer bolão montando a requisição na mão.
**Evidence:** Flag de signup no `config.toml` do Supabase; trigger `handle_new_user` que insere em `participantes` no cadastro; policy `participantes_insert_self` com `WITH CHECK (user_id = auth.uid())` e sem validação de convite.

### CSP permite `script-src 'unsafe-inline'`

**What it is:** A Content-Security-Policy servida no deploy estático libera `script-src 'self' 'unsafe-inline'`, então qualquer `<script>` inline (inclusive um injetado) executa sem ser barrado pela CSP.
**Why it matters:** A CSP é a última barreira antes de um script malicioso rodar. Com `'unsafe-inline'`, essa barreira não existe para injeção inline. Combinado com a sessão guardada em cookie acessível a JS, o caminho de ataque fecha: XSS → script inline roda → lê o cookie → sequestra a sessão. É uma limitação documentada do static export do Next (sem servidor não há nonce por request), mas o risco combinado não está mitigado.
**Evidence:** Diretiva `Content-Security-Policy` no arquivo de headers do deploy estático, linha do `script-src`.

### Tokens de sessão em cookie acessível a JavaScript (não-HttpOnly)

**What it is:** O cliente browser do `@supabase/ssr` guarda o JWT de acesso e o refresh token em cookie setado pelo JavaScript, que por definição não pode ter a flag `HttpOnly`. Qualquer script na origem consegue ler esses tokens.
**Why it matters:** Se um XSS surgir (via dependência comprometida ou `innerHTML` introduzido por engano), o atacante lê o token e o refresh token e sequestra a sessão indefinidamente — inclusive para palpitar no lugar da vítima ou, se for admin, mexer em placares. Risco latente (não há sink de XSS hoje), mas é o amplificador dos demais findings de XSS/CSP. É limitação arquitetural do static export (sem servidor não há cookie `HttpOnly`).
**Evidence:** Inicialização de `createBrowserClient` em `getSupabaseBrowserClient`, sem storage customizado; default `httpOnly: false` do pacote `@supabase/ssr`.

### `connect-src` da CSP usa wildcard `*.supabase.co`

**What it is:** A CSP permite conexões (REST e WebSocket) a qualquer subdomínio de `supabase.co`, e não apenas ao projeto específico deste bolão.
**Why it matters:** Num cenário de XSS, o atacante pode exfiltrar tokens e dados para um projeto Supabase controlado por ele e a conexão passa pela CSP sem alarme. Fixar o `<project-ref>` concreto (disponível no build) reduz a superfície de exfiltração autorizada.
**Evidence:** Diretiva `connect-src` no arquivo de headers do deploy estático.

### `eh_admin(uuid)` permite enumerar contas admin

**What it is:** A função `eh_admin` aceita qualquer UUID como parâmetro e está concedida a `authenticated`. Como a leitura de perfis usa `USING (true)`, qualquer logado lista todos os UUIDs e chama `eh_admin('<uuid>')` para cada um, descobrindo quais contas são admin.
**Why it matters:** O hardening que escondeu a coluna `is_admin` (revogando o SELECT) teve como objetivo exato impedir a enumeração de admins (alvo de phishing). A função com parâmetro livre reconstitui o vetor sem nunca tocar na coluna. O parâmetro externo deveria ser restrito ao próprio `auth.uid()`.
**Evidence:** Declaração de `eh_admin(uid uuid default auth.uid())` e seu `grant execute ... to authenticated` na migration que escondeu `is_admin`.

### Sem CHECK de range para gols (palpites e partidas)

**What it is:** As colunas de gols em `palpites` e em `partidas` são `int` sem nenhuma constraint `CHECK (>= 0)`. O limite 0–20 existe só no cliente, e o caminho de rascunho em `localStorage` contorna até esse limite (os valores são lidos do storage e vão direto para `parseInt` na submissão).
**Why it matters:** Validação no cliente não é segurança. Um participante pode editar o `localStorage` (ou chamar a API direto) e gravar gols negativos/absurdos no servidor. Não quebra a pontuação no caso comum (não dá match com o placar real), mas polui o banco com dados inválidos, pode quebrar telas e, em cenário de seed errado, alimentar cálculos de saldo na apuração. Vale para a escrita do admin também (resultado oficial sem validação de range na boundary crítica).
**Evidence:** Definição das colunas de gols em `palpites` e `partidas` na migration inicial, sem CHECK; clamp apenas no componente de palpite e validação `!isNaN` (sem range) no card de admin.

### `nodemailer` com CVE de SSRF/leitura de arquivo local

**What it is:** A versão instalada do `nodemailer` (`^8.0.11`) tem CVE HIGH (GHSA-p6gq-j5cr-w38f): via a opção `raw` do `sendMail`, contorna `disableFileAccess`/`disableUrlAccess` (leitura de arquivo local + SSRF). Patch em `>=9.0.1`.
**Why it matters:** O script de notificação roda com `service_role` no ambiente de CI. O uso atual **não** passa `raw`, então não é explorável diretamente hoje — mas a dependência é vulnerável e o vetor abre se o código evoluir. Atualizar é barato.
**Evidence:** Dependência `nodemailer` no `package.json`; chamada `sendMail` no script de notificação (sem `raw`).

### `postcss` transitivo com CVE de XSS de build-time

**What it is:** O Next puxa `postcss@8.4.31` (transitivo), abaixo do `8.5.10` que corrige um XSS via `</style>` não escapado no CSS gerado (GHSA-qx2v-qp2m-jg93).
**Why it matters:** Afeta o pipeline de build que gera o artefato publicado. Não é explorável no estado atual (não há CSS com conteúdo controlado por usuário), mas é uma vulnerabilidade conhecida na cadeia. O fix depende de uma versão do Next que traga `postcss >= 8.5.10` (ou override no lockfile).
**Evidence:** Árvore de dependências do `pnpm` (`next > postcss@8.4.31`).

### Ranking conta pontos de partida revertida para não-encerrada

**What it is:** `get_ranking()` soma `palpites.pontos` independentemente de a partida ainda estar `encerrada`. Se um admin encerra (apura os pontos) e depois reverte o status para `ao-vivo`/`agendada`, o trigger de apuração não dispara de novo e os pontos residuais continuam contando no total.
**Why it matters:** O total do ranking passa a depender de um estado (`status`) que pode ser revertido sem compensação automática, inflando a pontuação até a partida ser re-encerrada. O desempate já filtra por partida encerrada; o total principal não.
**Evidence:** `LEFT JOIN` de palpites em `get_ranking()` com `coalesce(sum(pi.pontos),0)` sem condicionar a `partida.status = 'encerrada'`.

### `updated_at` de palpite falsificável pelo cliente

**What it is:** O GRANT de UPDATE em `palpites` inclui a coluna `updated_at`, e o trigger só a sobrescreve com `now()` quando os gols mudam. Num UPDATE sem mudança de gols, o `updated_at` enviado pelo cliente passa direto — qualquer timestamp, passado ou futuro.
**Why it matters:** Não afeta pontuação nem a trava de horário (o kickoff vem de `partidas`), mas corrompe a trilha de auditoria: um palpite editado em cima da hora pode ter o `updated_at` forjado para horas antes, escondendo evidência de manipulação de última hora.
**Evidence:** GRANT de UPDATE incluindo `updated_at`; condição do trigger `bump_palpite_updated_at` que só dispara quando os gols mudam.

### Funções de janela do palpite sem `search_path` fixo

**What it is:** As funções de cálculo da janela do palpite criadas na migration de janela-do-dia não declaram `set search_path`, ao contrário do hardening aplicado às demais funções.
**Why it matters:** São `language sql stable` sem acesso a tabelas (só computam datas), então o risco de hijack via `search_path` é muito baixo hoje. É inconsistência de defense-in-depth: uma futura função `SECURITY DEFINER` que as chame herdaria o `search_path` do chamador.
**Evidence:** Declaração das duas funções de janela na migration de janela-do-dia, sem cláusula `set search_path`.

### `SENHA_DEV` hardcoded em escopo de módulo (pode vazar no bundle)

**What it is:** O botão de login de dev declara uma constante `SENHA_DEV` em escopo de módulo. O componente retorna `null` em produção, mas a constante de escopo de módulo pode não ser removida pela dead-code elimination e acabar no bundle de produção.
**Why it matters:** É senha de contas de teste do Supabase local (sem efeito em produção), mas viola o princípio de não expor credenciais — mesmo fictícias — em artefatos de produção, e confunde análise de segurança. Trivial de evitar (ler de env de dev).
**Evidence:** Constante `SENHA_DEV` no componente de login de dev.

### Chave publishable local hardcoded no `package.json`

**What it is:** O script `dev:local` embute inline a publishable key do Supabase local. O arquivo está versionado.
**Why it matters:** A chave é do Supabase local (`127.0.0.1`) e os scripts têm guard anti-prod, então o impacto direto é nulo. O risco é de padrão: replicar isso com a chave de produção, e o valor fica no histórico para sempre.
**Evidence:** Script `dev:local` no `package.json` com a env inline.

### MCP `serena` instalado sem pin de commit (supply chain de dev)

**What it is:** O `.mcp.json` instala o servidor MCP `serena` do branch padrão do GitHub via `uvx`, sem fixar hash de commit.
**Why it matters:** Se o repositório upstream for comprometido, a próxima execução puxaria e rodaria código com acesso total ao filesystem do dev (incluindo `.env*` e `~/.claude/`). É risco de ambiente de desenvolvimento, não de produção.
**Evidence:** Entrada do servidor `serena` no `.mcp.json` apontando para o repositório git sem hash.

### Sem scanning de dependências no CI

**What it is:** Não há workflow de CI rodando audit de dependências (npm audit/Dependabot/OSV). As deps usam ranges `^` em libs críticas (Supabase, React, zod, etc.).
**Why it matters:** O `--frozen-lockfile` protege o build do Netlify, mas não o desenvolvedor numa instalação limpa. Um maintainer comprometido numa lib passaria despercebido, e código malicioso no front consegue ler os tokens de sessão.
**Evidence:** Ranges `^` no `package.json`; ausência de `.github/workflows/`.

### `undici` transitivo com CVE (apenas dev/test)

**What it is:** `undici@7.27.1` (transitivo via `vitest > jsdom`) tem CVE de bypass de validação TLS e information disclosure. Versões afetadas `>=7.0.0 <7.28.0`.
**Why it matters:** Existe só no ambiente de teste (devDependency); o build de produção é estático e não roda Node em runtime — risco de produção zero. Vetor teórico só num CI comprometido fazendo rede real.
**Evidence:** Árvore de dependências do `pnpm` (`vitest > jsdom > undici@7.27.1`).

## Applied sub-skills

- browser: surfou "CSP permite `script-src 'unsafe-inline'`", "Tokens de sessão em cookie acessível a JavaScript", "`connect-src` da CSP usa wildcard" e o bypass via `localStorage` em "Sem CHECK de range para gols". Confirmou mitigado o open-redirect em `/auth/callback` (valida `startsWith("/") && !startsWith("//")`).
- javascript: aplicada, sem achados — zero `eval`/`new Function`/`setTimeout(string)`, sem `child_process`, sem prototype pollution (nenhum merge profundo a partir de chave controlada), sem comparação de segurança em `==`.
- regex: aplicada, sem achados — nenhuma regex com quantificadores aninhados/empilhados (ReDoS) aplicada a input do usuário em `src/`.

## Já protegido (confirmado, não é finding)

- RLS habilitada nas 9 tabelas; `pontos` fora de todo GRANT de INSERT/UPDATE (só `apurar_pontos()` SECURITY DEFINER escreve).
- Trava de horário do palpite por trigger `enforce_palpite_lock` usando `now()` do servidor; `participante_id`/`partida_id` imutáveis após criação (ataque de "teleporte" fechado).
- `is_admin` fora do GRANT de SELECT e de UPDATE; admin verificado no servidor via `eh_admin` (SECURITY DEFINER) e policy `partidas_update_admin`.
- Apuração 100% server-side e idempotente por partida; cliente não calcula nem grava pontos.
- Demais funções `SECURITY DEFINER` com `set search_path = public, pg_temp` fixo.
- Nenhum segredo real commitado (só arquivos `*.example`); `out/`/`.next/` fora do git; sem `service_role` no bundle.
- Headers de segurança fortes no deploy estático: HSTS+preload, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP/CORP, `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`.
- Token de convite gerado com 128 bits de entropia (`gen_random_bytes(16)`).
- Sem `dangerouslySetInnerHTML`/`innerHTML`/`postMessage` inseguro em `src/`.

## Not determined

- Existência e configuração de Edge Functions em produção: `supabase/functions/` contém apenas `.gitkeep` no repo. Se houver funções implantadas fora do versionamento (ex.: ingestão de resultados da API de futebol), elas não foram auditadas — ficam fora do escopo do que o código mostra.
