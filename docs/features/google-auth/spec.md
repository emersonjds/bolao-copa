# Design — Fase 2: Login com Google (Supabase Auth)

**Data:** 2026-06-05
**Status:** design aprovado (aguardando revisão do spec)
**Escopo:** fatia de autenticação do [MVP](./2026-06-05-mvp-bolao-funcional-design.md) (§4).
Login com Google, sessão no client, proteção de rota e auto-inscrição no bolão padrão.

---

## 1. Objetivo

Sair de "o app não sabe quem é o usuário" para um login funcional de ponta a ponta:
a pessoa entra com Google, o app reconhece a sessão, e no 1º login ela já vira
**participante do bolão padrão** (senão o bolão fica invisível por RLS).

A parte pesada do OAuth (redirect ao Google, tokens, persistência e refresh de sessão)
é serviço pronto do **Supabase Auth** — escrevemos apenas a cola no client.

## 2. Decisões (brainstorming)

- **Provedor:** Google apenas. Botão único "Entrar com Google".
- **Mecânica de UX:** _explorar e logar na ação_. `/` e `/ranking` ficam abertos;
  o login só é pedido quando a pessoa vai **palpitar** (`/palpites`).
- **Callback (app estático, sem servidor):** rota dedicada **`/auth/callback`** que troca
  o `?code=` pela sessão (`exchangeCodeForSession`, fluxo PKCE do `@supabase/ssr`).
- **Auto-inscrição:** feita no banco (gatilho `handle_new_user`), atômica com o cadastro.
- **Fora de escopo hoje:** `profiles.is_admin` e a proteção de `/admin` (vão na fase de Admin).

## 3. Banco — migration `0004_auth_autoinscricao.sql`

Estende a função `public.handle_new_user()` (já `SECURITY DEFINER`) para, **na mesma
transação** do cadastro em `auth.users`, além de criar o `profile`, inserir:

```sql
insert into public.participantes (bolao_id, user_id)
values ('00000000-0000-0000-0000-000000000b01', new.id)
on conflict (bolao_id, user_id) do nothing;
```

- `participantes.user_id` referencia `auth.users(id)`; o bolão padrão é o UUID fixo da `0002`.
- Atômico resolve o achado do MVP (§4): a policy `boloes_select` exige ser participante;
  sem inscrição síncrona o bolão padrão (`organizador_id = null`) sumiria da UI.
- Idempotente via `on conflict do nothing`.

## 4. Client / Frontend

```
shared/lib/supabase/
  auth.ts          → signInWithGoogle(), signOut() (cola fina sobre o client)
features/auth/
  AuthProvider     → lê getSession() no load + escuta onAuthStateChange
  useSession()     → sessão atual (ou null)
  useUser()        → usuário atual (ou null)
  components/
    LoginCTA       → bloco "Entrar com Google" (usado na proteção de /palpites)
app/
  auth/callback/page.tsx → client: exchangeCodeForSession → redireciona p/ destino
  layout.tsx       → AuthProvider envolvendo o AppShell
  palpites/page.tsx → guard: sem sessão → LoginCTA; com sessão → conteúdo
```

- `signInWithGoogle()` chama `signInWithOAuth({ provider: 'google',
options: { redirectTo: \`${window.location.origin}/auth/callback\` } })`.
- O AuthProvider expõe `{ session, user, loading, signInWithGoogle, signOut }`.
- O botão de sair aparece quando há sessão (no header/menu existente).

## 5. Fluxo

1. Visitante abre o link → vê `/` e `/ranking` (hoje via MSW) sem login.
2. Clica em "Fazer meu palpite" → `/palpites` sem sessão → mostra `LoginCTA`.
3. Clica "Entrar com Google" → Supabase redireciona ao Google → autoriza.
4. Google volta em `/auth/callback?code=…` → `exchangeCodeForSession` cria a sessão.
5. Gatilho `handle_new_user` (1º login) cria `profile` + inscreve em `participantes`.
6. Callback redireciona de volta para `/palpites`, agora logado e participante.

## 6. Configuração do Supabase (manual, guiada)

No painel: Authentication → Providers → Google (Client ID/Secret do Google Cloud);
cadastrar as Redirect URLs (`http://localhost:3000/auth/callback` e a de produção).
Feito uma vez; não é código.

## 7. Riscos / follow-ups

- **Leitura pública dos dados:** `partidas_select`/`selecoes_select` hoje só liberam
  `authenticated`. A mecânica "explorar sem login" funciona enquanto a home lê do MSW;
  ao trocar para dados reais do Supabase (fase seguinte) será preciso liberar `anon`.
  **Não bloqueia a Fase 2.**
- **OAuth em static export:** validar o redirect/callback sem servidor Next (rota client estática).
- **Trailing slash:** static export gera `/auth/callback/`; conferir a URL de redirect.

## 8. Fatias de commit (atômicas)

`migration 0004 → auth.ts → AuthProvider/hooks → /auth/callback → wire no layout →
LoginCTA + guard de /palpites`.
