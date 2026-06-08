# Auditoria de Performance — Bolão da Copa 2026

**Data**: 2026-06-07  
**Stack**: Next.js 16.2.6 (Turbopack), React 19, `output: "export"`, Tailwind 4, Supabase browser client, TanStack Query 5  
**Build**: `pnpm build` em produção com variáveis reais  

---

## A. Métricas Atuais (valores reais do build)

### A1. Bundle JavaScript por Rota — First Load JS (gzip)

| Rota | First Load JS (gz) | Chunk específico (gz) | Notas |
|---|---|---|---|
| `/` (Home) | **274 KB** | +4 KB | HeroStats + ProximoJogo + ProximosJogos + Destaque |
| `/palpites` | **278 KB** | +8 KB | PalpitesContent + formulário |
| `/ranking` | **272 KB** | +2 KB | Menor rota |
| `/calendario` | **283 KB** | +13 KB | SeletorSemana + AgendaList |
| `/admin` | **288 KB** | +18 KB | Maior rota (lazy chunk OK) |
| `/regras` | **270 KB** | 0 KB | Nenhum chunk exclusivo |

**Base compartilhada (todas as rotas)**: 270 KB gzip / ~900 KB descomprimido  
**Total do deploy estático** (`out/`): 2.3 MB (assets + HTML)  
**CSS**: 48 KB raw / **9 KB gzip** (Tailwind JIT ótimo)  

### A2. Decomposição dos Maiores Chunks

| Chunk | Raw | Gzip | Conteúdo identificado |
|---|---|---|---|
| `06wq.2hihlevh.js` | 320 KB | **70 KB** | `@supabase/ssr` + `@supabase/supabase-js` |
| `0mic4x9ug0k3v.js` | 256 KB | **69 KB** | React DOM + internals Next.js |
| `0rom9dut9n1cq.js` | 192 KB | **40 KB** | Next.js runtime (Turbopack) |
| `03~yq9q893hmn.js` | 128 KB | **38 KB** | Bundle legacy `noModule` (browsers antigos) |
| `121hn7wzzs2uo.js` | 56 KB | **13 KB** | TanStack Query + código da app |
| `0_pxc4-htpjbz.js` | 40 KB | **10 KB** | Sonner (toasts) |
| CSS | 48 KB | **9 KB** | Tailwind JIT completo |

### A3. Supabase — Chamadas por Tela

| Tela | Chamadas Supabase | Observações |
|---|---|---|
| `/` (home, autenticado) | **4** | `getSession` + `getUser` (auth) + `partidas` + `get_ranking` + `get_destaque_rodada` |
| `/` (home, anônimo) | **2** | `getSession` + `getUser` apenas (ranking/partidas bloqueadas pelo auth guard) |
| `/palpites` | **3–4** | auth (cache) + `participante-id` + `partidas` (cache ou fetch) + `palpites` |
| `/ranking` | **3** | auth + `get_ranking` + `get_destaque_rodada` |
| `/calendario` | **2** | auth + `partidas` (compartilhado pelo cache TQ se já na home) |

### A4. Configuração TanStack Query

| Parâmetro | Valor configurado | Avaliação |
|---|---|---|
| `staleTime` (global) | 60 s | Aceitável, mas partidas poderiam ser mais |
| `gcTime` | 5 min | OK |
| `refetchOnWindowFocus` | `false` | Correto para este domínio |
| `retry` | 1 | OK |
| `staleTime` partidas | 60 s (default) | Baixo — partidas mudam ~3×/dia |
| `staleTime` ranking | 2 min | Razoável |
| `staleTime` palpites de destaque | 2 min | Razoável |
| `staleTime` participante-id | `Infinity` | Perfeito |

### A5. Fontes

| Fonte | Peso | Uso | Carregada em |
|---|---|---|---|
| Inter | latin subset | `font-sans` — corpo | **Todas as rotas** |
| Hanken Grotesk | latin subset | `font-display` — títulos | **Todas as rotas** |
| JetBrains Mono | latin subset | `font-mono` — placares e pontos | **Todas as rotas** |

- `display: "swap"` configurado (sem FOIT) ✓
- Preloads de 3 woff2 no `<head>` gerados automaticamente ✓
- JetBrains Mono carregado em todas as rotas mesmo sendo usado só em placares (desperdício)

### A6. Imagens

| Componente | Mecanismo | CLS | Observações |
|---|---|---|---|
| `FlagIcon` | `<img>` externo `flagcdn.com` | Baixo | Container com tamanho fixo (h-10 w-10). Sem width/height no `<img>`. `loading="lazy"` ✓ |
| `AvatarParticipante` | `<img>` Google OAuth | Zero | `width`/`height` definidos ✓ |
| `images.unoptimized: true` | Necessário para static export | — | Sem otimização automática |

**Flag-icons**: instalado como dependência (`^7.5.0`, 5.5 MB em disco) porém **zero bytes no bundle** — `FlagIcon` usa `flagcdn.com` diretamente. Dependência morta.

### A7. HTTP Cache / Deploy

| Item | Status (resolvido nesta leva) |
|---|---|
| `_next/static/*` | ✅ Imutável (`max-age=31536000, immutable` em `public/_headers`) |
| HTML pages (`index.html`, etc.) | ✅ `max-age=300, stale-while-revalidate=86400` em `public/_headers` |
| Preconnect para Supabase | ✅ adicionado no `layout.tsx` |
| Preconnect para `flagcdn.com` | ✅ adicionado no `layout.tsx` |
| Headers de segurança (CSP, HSTS) | ✅ em `public/_headers` (Netlify) |

---

## B. Problemas Identificados — Lista Priorizada

### ALTA Prioridade

---

**B1. ProximosJogos renderiza TODAS as 104 partidas na home**  
**Impacto**: Alto — TBT, INP, DOM size  
**Esforço**: Baixo

`ProximosJogos` (usado na `/`) não tem nenhum filtro: chama `partidas.map(...)` sobre o array completo. Com 104 partidas (Copa completa) e cada `CardJogo` tendo 2 `FlagIcon`, o dashboard monta 104 cards + 208 chamadas de imagem na carga inicial. O nome do componente promete "próximos jogos" mas entrega o campeonato inteiro.

Correção: filtrar dentro de `ProximosJogos` para mostrar apenas os N próximos (ex.: 3–5 jogos agendados), ou receber uma prop `limit`. O componente `ProximoJogoDestaque` já faz isso corretamente para 1 jogo em 24h.

**Impacto estimado**: −70% de nós DOM no dashboard, melhora TBT em 50–100ms em dispositivos low-end, reduz requisições a `flagcdn.com` de ~208 para ~10.

---

**B2. Waterfall de 3 níveis em /palpites**  
**Impacto**: Alto — LCP, tempo para conteúdo interativo  
**Esforço**: Médio

A cadeia é:
1. `useSupabaseUser()` → `getUser()` resolve (~100ms)
2. Então `useParticipanteAtual()` dispara (`buscarParticipanteId`)  (~100ms)
3. Então `useMeusPalpites()` dispara (`listarMeusPalpites`) (~100ms)

Total: ~300ms de latência sequencial só de auth + dados antes de qualquer render de conteúdo. Em Supabase US com usuário no Brasil, isso é facilmente 400–600ms.

Correção: buscar `participanteId` logo que a sessão é estabelecida no `AuthProvider` (pré-fetching no login) e armazenar no contexto ou no TanStack Query. As queries subsequentes deixam de depender do resultado das anteriores.

**Impacto estimado**: Reduzir tempo de renderização do conteúdo de palpites em ~200–400ms.

---

**B3. Dupla assinatura de auth (AuthProvider + useSupabaseUser)**  
**Impacto**: Médio-Alto — latência de hydration, complexidade  
**Esforço**: Médio

`AuthProvider` chama `getSession()` e `useSupabaseUser()` chama `getUser()` — dois handlers distintos que se resolvem independentemente. Ambos fazem fan-out do cliente Supabase, mas criam dois `useEffect` separados, dois listeners de `onAuthStateChange` e dois estados de React que atualizam a árvore em momentos diferentes. O resultado: componentes que dependem de `useSupabaseUser` (como `useMeuParticipanteId`, `useParticipanteAtual`) podem renderizar com `null` mesmo quando o `AuthContext` já tem o usuário.

Correção: `useSupabaseUser` deveria consumir o `AuthContext` em vez de abrir sua própria assinatura. Ou unificar `getSession`/`getUser` no Provider e expor via contexto.

---

**B4. `partidas` staleTime muito baixo (60s)**  
**Impacto**: Médio — requests desnecessários ao Supabase  
**Esforço**: Muito Baixo

Dados de partidas mudam no máximo 3×/dia (ao começar, ao encerrar cada jogo). 60 segundos de stale forçam refetch a cada minuto quando o usuário alterna entre abas — mesmo que nada tenha mudado. O banco lida com isso bem, mas é custo gratuito desnecessário e uma `supabase.from("partidas").select(...)` pesada (104 rows com joins).

Correção: aumentar `staleTime` de partidas para `10 * 60 * 1000` (10 min) e adicionar invalidação manual quando necessário (ex.: após mutation de admin).

**Impacto estimado**: Reduzir ~90% dos fetches de partidas em sessões longas.

---

### MÉDIA Prioridade

---

**B5. Ausência de `preconnect` para Supabase e flagcdn.com**  
**Impacto**: Médio — LCP, tempo de primeira requisição  
**Esforço**: Muito Baixo

Sem `<link rel="preconnect">` para o domínio Supabase (ex.: `xyz.supabase.co`) e para `flagcdn.com`, o browser faz DNS lookup + TLS handshake na primeira requisição de dados e na primeira flag visível. Para usuários no Brasil conectando a Supabase US-east, isso adiciona facilmente 150–300ms ao LCP.

Correção: adicionar em `app/layout.tsx`:
```tsx
<link rel="preconnect" href="https://[project].supabase.co" />
<link rel="preconnect" href="https://flagcdn.com" crossOrigin="" />
```

**Impacto estimado**: −150–300ms no tempo de primeira request para dados.

---

**B6. JetBrains Mono carregada em todas as rotas**  
**Impacto**: Médio — bytes desnecessários, layout shift em `/regras` e `/calendario`  
**Esforço**: Baixo

A rota `/regras` e a home `/` dificilmente usam `font-mono`. JetBrains Mono tem ~20KB gzip de dados de font extras para latin. Em `/regras` (rota mais leve, 270 KB gz de JS) a fonte é carregada sem nenhum uso.

Correção: aplicar a fonte apenas nas rotas que precisam (`/palpites`, `/ranking`) usando layout aninhado do App Router, ou substituir JetBrains Mono por `ui-monospace` (system-ui) nos placares — perda visual mínima, ganho de latência.

---

**B7. Cache HTTP do HTML** ✅ **RESOLVIDO**
**Impacto**: Médio — usuários recorrentes recarregam HTML a cada visita

Resolvido em `public/_headers` (honrado pelo Netlify): HTML com `Cache-Control: public, max-age=300, stale-while-revalidate=86400` e `/_next/static/*` imutável (`max-age=31536000, immutable`).

---

**B8. flag-icons como dependência morta**  
**Impacto**: Baixo (prod) / Médio (dev e install time)  
**Esforço**: Muito Baixo

O pacote `flag-icons` (`^7.5.0`) ocupa 5.5 MB em `node_modules` e não é importado em nenhum arquivo de produção — `FlagIcon` usa `flagcdn.com` via `<img>`. Zero contribuição ao bundle. Prolonga `pnpm install` desnecessariamente.

Correção: remover do `package.json`.

---

**B9. Ausência de virtualização em listas longas**  
**Impacto**: Médio — INP/TBT em /calendario e /palpites (histórico)  
**Esforço**: Alto

`AgendaList` no `/calendario` renderiza todas as 104 partidas agrupadas por dia em DOM plano. `HistoricoContent` em `/palpites` renderiza todas as partidas encerradas. Sem virtualização, um usuário que chegou na final da Copa com 80+ jogos encerrados renderiza 80+ `CardHistorico` em DOM simultaneamente.

Alternativa de menor esforço: paginação/expansão progressiva (mostrar 20 por vez com botão "carregar mais") é mais simples que TanStack Virtual e igualmente efetiva para este volume.

Virtualização completa (TanStack Virtual) vale se houver > 100 itens visíveis e a lista não usar sticky headers por fase.

---

### BAIXA Prioridade

---

**B10. Sonner (10 KB gz) compartilhado em todas as rotas**  
**Impacto**: Baixo — 10 KB extras em rotas que não têm mutations  
**Esforço**: Médio

O `<Toaster />` está no `RootLayout`, carregando Sonner em `/regras`, `/ranking` e `/calendario` — rotas que nunca disparam toasts. O componente `Toaster` é pequeno (10 KB gz) e o impacto é marginal, mas é um candidato a lazy-load via `dynamic()`.

---

**B11. AvatarParticipante sem crossOrigin para Google avatars**  
**Impacto**: Baixo — cache hit rate de imagens em CDN compartilhado  
**Esforço**: Muito Baixo

O `<img src={avatarUrl}>` de avatares Google OAuth deveria ter `crossOrigin="anonymous"` para que o browser possa reutilizar a imagem do cache quando o mesmo avatar aparece em múltiplos componentes (ranking, destaque rodada).

---

**B12. `noModule` bundle (03~yq9q893hmn.js, 38KB gz) para browsers antigos**  
**Impacto**: Baixo (usuários modernos não carregam)  
**Esforço**: Alto / configuração Turbopack

O chunk `03~yq9q893hmn.js` com atributo `noModule` existe para suportar browsers que não entendem ES modules. Para uma SPA de bolão de amigos, esse target provavelmente pode ser descartado via `browserslist`. Verificar se vale o aumento de complexidade de configuração.

---

## C. Quick-Wins Seguros (sem risco de regressão)

Lista em ordem de impacto/esforço:

| # | Ação | Arquivo | Impacto | Tempo estimado |
|---|---|---|---|---|
| 1 | Adicionar `preconnect` Supabase + flagcdn.com | `src/app/layout.tsx` | −150–300ms LCP | 5 min |
| 2 | Filtrar ProximosJogos para 5 próximos | `src/features/partidas/components/proximos-jogos.tsx` | −70% DOM home, −90% flags | 15 min |
| 3 | Aumentar staleTime de partidas para 10 min | `src/features/partidas/api/queries.ts` | −90% fetches desnecessários | 5 min |
| 4 | Remover `flag-icons` do `package.json` | `package.json` | −5.5 MB install, sem impacto prod | 2 min |
| 5 | `crossOrigin="anonymous"` no AvatarParticipante | `src/shared/ui/avatar-participante.tsx` | Cache CDN de avatares | 5 min |

---

## D. Estimativas Core Web Vitals

Baseadas na análise de bundle, waterfall de dados e estrutura DOM:

| Métrica | Estimativa (4G, device mid-range) | Alvo | Status |
|---|---|---|---|
| **LCP** (usuário logado) | 3.5–5.0 s | < 2.5 s | Ruim |
| **LCP** (usuário anônimo) | 2.0–2.5 s | < 2.5 s | Borderline |
| **CLS** | < 0.05 | < 0.1 | Bom |
| **INP** (edição de palpite) | 100–200 ms | < 200 ms | Borderline |
| **TBT** (proxy TTI) | 150–400 ms | < 200 ms | Borderline/Ruim |

**Principal ofensor do LCP**: waterfall de 3 requests sequenciais para dados após hydration (auth → participante-id → palpites). O conteúdo significativo da home depende da sessão Supabase, forçando LCP > 3s em condições de rede móvel brasileira.

**Principal ofensor do TBT**: 900 KB de JS descomprimido para parsear. Em dispositivos Android mid-range (~500 JS score no Lighthouse), isso é ~250ms de parse. Reduzir para < 700 KB descomprimido seria o próximo passo.

---

## E. Arquitetura: O que Já Está Bem

- Code splitting por rota funcionando (Admin: +18KB gz isolado, Palpites: +8KB gz)
- TanStack Query com `refetchOnWindowFocus: false` e `staleTime` adequado
- Tailwind 4 JIT: CSS de apenas 9 KB gz para todo o design system
- `flag-icons` não está no bundle (FlagIcon usa CDN externo)
- `loading="lazy"` em todas as flags
- Fontes com `display: "swap"` e preloads corretos
- `participanteId` com `staleTime: Infinity` (1 fetch por sessão)
- Admin chunk lazy carregado apenas em `/admin`
- FSD com barrel indexes que não extravasam para outras camadas
