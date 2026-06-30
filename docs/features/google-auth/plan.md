# Fase 2 — Login com Google Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login com Google funcional (Supabase Auth), sessão no client, proteção de `/palpites` e auto-inscrição do usuário no bolão padrão no 1º login.

**Architecture:** O Supabase Auth faz o OAuth (redirect, tokens, sessão). O frontend só adiciona cola: helpers `signInWithGoogle`/`signOut`, um `AuthProvider` (context com `onAuthStateChange`), uma rota estática `/auth/callback` que troca o código pela sessão (PKCE), e um guard simples em `/palpites`. No banco, o gatilho `handle_new_user` passa a inscrever o usuário em `participantes` na mesma transação do cadastro.

**Tech Stack:** Next.js 16 (App Router, static export), React 19, TypeScript, `@supabase/ssr` + `@supabase/supabase-js`, Vitest + Testing Library, Supabase CLI (migrations).

**Spec:** `docs/superpowers/specs/2026-06-05-fase2-google-auth-design.md`

---

## File Structure

- `supabase/migrations/0004_auth_autoinscricao.sql` — **Create.** Redefine `handle_new_user()` p/ inscrever em `participantes`.
- `src/shared/lib/supabase/client.ts` — **Modify.** Fluxo PKCE explícito (`flowType: 'pkce'`, `detectSessionInUrl: false`).
- `src/shared/lib/supabase/auth.ts` — **Create.** `signInWithGoogle()`, `signOut()`.
- `src/shared/lib/supabase/index.ts` — **Modify.** Reexporta os helpers.
- `src/features/auth/auth-context.ts` — **Create.** Tipo + objeto de contexto React.
- `src/features/auth/auth-provider.tsx` — **Create.** `AuthProvider` (client component).
- `src/features/auth/use-auth.ts` — **Create.** `useAuth()`, `useUser()`, `useSession()`.
- `src/features/auth/components/login-cta.tsx` — **Create.** Bloco "Entrar com Google".
- `src/features/auth/index.ts` — **Create.** API pública da feature.
- `src/app/auth/callback/page.tsx` — **Create.** Troca código → sessão → redireciona.
- `src/app/layout.tsx` — **Modify.** Envolve o `AppShell` com `AuthProvider`.
- `src/app/palpites/page.tsx` — **Modify.** Guard: sem sessão → `LoginCTA`.
- `src/widgets/app-shell/ui/top-bar.tsx` — **Modify.** Botão "Sair" quando logado.

---

## Task 1: Migration — auto-inscrição no bolão padrão

**Files:**

- Create: `supabase/migrations/0004_auth_autoinscricao.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- 0004_auth_autoinscricao.sql
-- Estende handle_new_user(): além de criar o profile, inscreve o novo usuário
-- no bolão padrão (UUID fixo da 0002), na MESMA transação do cadastro.
-- Atômico: a policy boloes_select exige ser participante, então a inscrição
-- precisa existir já no 1º login, senão o bolão padrão fica invisível na UI.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nome, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );

  insert into public.participantes (bolao_id, user_id)
  values ('00000000-0000-0000-0000-000000000b01', new.id)
  on conflict (bolao_id, user_id) do nothing;

  return new;
end;
$$;
```

- [ ] **Step 2: Aplicar a migration no projeto Supabase**

Run: `pnpm supabase db push` (ou `supabase db push`)
Expected: aplica `0004_auth_autoinscricao.sql` sem erro. Confirma a versão remota.

> Se o CLI pedir login/link: `supabase link --project-ref <ref de supabase/.temp/project-ref>`.

- [ ] **Step 3: Verificar a função no banco**

Run (psql/DBeaver ou `supabase db execute`):

```sql
select prosrc from pg_proc where proname = 'handle_new_user';
```

Expected: o corpo contém o `insert into public.participantes`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_auth_autoinscricao.sql
git commit -m "extend handle_new_user to enroll into default bolao"
```

---

## Task 2: Client Supabase em fluxo PKCE explícito

**Files:**

- Modify: `src/shared/lib/supabase/client.ts`

Motivo: na rota de callback queremos trocar o código pela sessão **explicitamente**.
Desligamos a detecção automática na URL para o controle ficar no nosso código.

- [ ] **Step 1: Ajustar as opções do client**

Em `getSupabaseBrowserClient`, troque a criação do client por:

```ts
browserClient ??= createBrowserClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: "pkce",
    detectSessionInUrl: false,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/supabase/client.ts
git commit -m "configure supabase client for explicit pkce flow"
```

---

## Task 3: Helpers de auth (signInWithGoogle, signOut)

**Files:**

- Create: `src/shared/lib/supabase/auth.ts`
- Modify: `src/shared/lib/supabase/index.ts`
- Test: `src/shared/lib/supabase/auth.test.ts`

- [ ] **Step 1: Escrever o teste falhando**

```ts
// auth.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest";

const signInWithOAuth = vi.fn();
const signOut = vi.fn();

vi.mock("./client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { signInWithOAuth, signOut } }),
}));

import { signInWithGoogle, signOutUser } from "./auth";

describe("auth helpers", () => {
  beforeEach(() => {
    signInWithOAuth.mockReset();
    signOut.mockReset();
    vi.stubGlobal("window", { location: { origin: "https://app.test" } });
  });

  it("chama signInWithOAuth com provider google e redirect para /auth/callback", async () => {
    await signInWithGoogle();
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://app.test/auth/callback" },
    });
  });

  it("encaminha o destino pós-login via query next", async () => {
    await signInWithGoogle("/palpites");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: "https://app.test/auth/callback?next=%2Fpalpites" },
    });
  });

  it("signOutUser chama supabase.auth.signOut", async () => {
    await signOutUser();
    expect(signOut).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `pnpm vitest run src/shared/lib/supabase/auth.test.ts`
Expected: FAIL — `signInWithGoogle`/`signOutUser` não existem.

- [ ] **Step 3: Implementar os helpers**

```ts
// auth.ts
import { getSupabaseBrowserClient } from "./client";

/**
 * Inicia o login com Google. O Supabase redireciona ao Google e, de volta,
 * para `/auth/callback`. `next` (opcional) é o caminho para onde voltar após logar.
 */
export async function signInWithGoogle(next?: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const callback = new URL("/auth/callback", window.location.origin);
  if (next) callback.searchParams.set("next", next);

  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
}

/** Encerra a sessão atual. */
export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}
```

- [ ] **Step 4: Reexportar na index**

Em `src/shared/lib/supabase/index.ts`, adicione:

```ts
export { signInWithGoogle, signOutUser } from "./auth";
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `pnpm vitest run src/shared/lib/supabase/auth.test.ts`
Expected: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/supabase/auth.ts src/shared/lib/supabase/auth.test.ts src/shared/lib/supabase/index.ts
git commit -m "add google sign-in and sign-out helpers"
```

---

## Task 4: AuthProvider + hooks de sessão

**Files:**

- Create: `src/features/auth/auth-context.ts`
- Create: `src/features/auth/auth-provider.tsx`
- Create: `src/features/auth/use-auth.ts`
- Create: `src/features/auth/index.ts`
- Test: `src/features/auth/auth-provider.test.tsx`

- [ ] **Step 1: Criar o contexto**

```ts
// auth-context.ts
import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export interface AuthState {
  session: Session | null;
  user: User | null;
  /** true enquanto a sessão inicial ainda está sendo carregada. */
  loading: boolean;
}

export const AuthContext = createContext<AuthState | undefined>(undefined);
```

- [ ] **Step 2: Escrever o teste falhando do provider**

```tsx
// auth-provider.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const getSession = vi.fn().mockResolvedValue({ data: { session: null } });
const onAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

vi.mock("@/shared/lib/supabase", () => ({
  getSupabaseBrowserClient: () => ({ auth: { getSession, onAuthStateChange } }),
}));

import { AuthProvider } from "./auth-provider";
import { useAuth } from "./use-auth";

function Probe() {
  const { loading, user } = useAuth();
  return <span>{loading ? "carregando" : user ? "logado" : "deslogado"}</span>;
}

describe("AuthProvider", () => {
  it("começa carregando e resolve para deslogado sem sessão", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("deslogado")).toBeInTheDocument());
    expect(getSession).toHaveBeenCalledOnce();
    expect(onAuthStateChange).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `pnpm vitest run src/features/auth/auth-provider.test.tsx`
Expected: FAIL — módulos não existem.

- [ ] **Step 4: Implementar o provider**

```tsx
// auth-provider.tsx
"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { AuthContext, type AuthState } from "./auth-context";

/** Disponibiliza a sessão do Supabase para toda a árvore (o "crachá" global). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = { session, user: session?.user ?? null, loading };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 5: Implementar os hooks**

```ts
// use-auth.ts
import { useContext } from "react";
import { AuthContext, type AuthState } from "./auth-context";

/** Estado completo de auth. Lança se usado fora do AuthProvider. */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>.");
  }
  return ctx;
}

/** Usuário logado (ou null). */
export function useUser() {
  return useAuth().user;
}

/** Sessão atual (ou null). */
export function useSession() {
  return useAuth().session;
}
```

- [ ] **Step 6: Criar a API pública da feature**

```ts
// index.ts
export { AuthProvider } from "./auth-provider";
export { useAuth, useUser, useSession } from "./use-auth";
export { LoginCTA } from "./components/login-cta";
```

> Nota: o `index.ts` exporta `LoginCTA` (criado na Task 6). Até lá, omita essa linha
> e adicione-a na Task 6 para o módulo compilar a cada passo.

- [ ] **Step 7: Rodar e ver passar**

Run: `pnpm vitest run src/features/auth/auth-provider.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/auth/auth-context.ts src/features/auth/auth-provider.tsx src/features/auth/use-auth.ts src/features/auth/index.ts src/features/auth/auth-provider.test.tsx
git commit -m "add auth provider and session hooks"
```

---

## Task 5: Rota de callback `/auth/callback`

**Files:**

- Create: `src/app/auth/callback/page.tsx`

- [ ] **Step 1: Implementar a página de callback (client)**

```tsx
// page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";

/**
 * Retorno do OAuth: o Google manda de volta para cá com `?code=...`.
 * Trocamos o código pela sessão (PKCE) e redirecionamos para `next` (ou home).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next") ?? "/";

    if (!code) {
      router.replace(next);
      return;
    }

    getSupabaseBrowserClient()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setErro("Não foi possível concluir o login. Tente novamente.");
          return;
        }
        router.replace(next);
      });
  }, [router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-medium text-foreground">{erro ?? "Entrando..."}</p>
      {erro && (
        <a href="/" className="text-sm font-semibold text-brand-700 underline">
          Voltar ao início
        </a>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build estático (a rota precisa existir no export)**

Run: `pnpm type-check`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/page.tsx
git commit -m "add oauth callback route"
```

---

## Task 6: LoginCTA + guard em `/palpites`

**Files:**

- Create: `src/features/auth/components/login-cta.tsx`
- Modify: `src/features/auth/index.ts`
- Modify: `src/app/palpites/page.tsx`
- Test: `src/features/auth/components/login-cta.test.tsx`

- [ ] **Step 1: Escrever o teste falhando do LoginCTA**

```tsx
// login-cta.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInWithGoogle = vi.fn();
vi.mock("@/shared/lib/supabase", () => ({ signInWithGoogle }));

import { LoginCTA } from "./login-cta";

describe("LoginCTA", () => {
  it("mostra o botão e chama signInWithGoogle com o next ao clicar", async () => {
    render(<LoginCTA next="/palpites" />);
    const botao = screen.getByRole("button", { name: /entrar com google/i });
    await userEvent.click(botao);
    expect(signInWithGoogle).toHaveBeenCalledWith("/palpites");
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `pnpm vitest run src/features/auth/components/login-cta.test.tsx`
Expected: FAIL — `LoginCTA` não existe.

- [ ] **Step 3: Implementar o LoginCTA**

```tsx
// login-cta.tsx
"use client";

import { LogIn } from "lucide-react";
import { signInWithGoogle } from "@/shared/lib/supabase";

interface LoginCTAProps {
  /** Caminho para onde voltar após o login. */
  next?: string;
  titulo?: string;
  descricao?: string;
}

/** Bloco de chamada para login com Google (porta de entrada da ação protegida). */
export function LoginCTA({
  next,
  titulo = "Entre para palpitar",
  descricao = "Use sua conta Google para fazer e salvar seus palpites.",
}: LoginCTAProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <LogIn className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{descricao}</p>
      </div>
      <button
        type="button"
        onClick={() => signInWithGoogle(next)}
        className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        Entrar com Google
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Exportar na index da feature**

Garanta que `src/features/auth/index.ts` contém:

```ts
export { LoginCTA } from "./components/login-cta";
```

- [ ] **Step 5: Rodar e ver passar**

Run: `pnpm vitest run src/features/auth/components/login-cta.test.tsx`
Expected: PASS.

- [ ] **Step 6: Aplicar o guard em `/palpites`**

Substitua `src/app/palpites/page.tsx` por:

```tsx
"use client";

import { Target } from "lucide-react";
import { LoginCTA, useAuth } from "@/features/auth";

export default function PalpitesPage() {
  const { user, loading } = useAuth();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">Meus palpites</h1>
        <p className="text-sm text-muted-foreground">
          Garanta seus pontos prevendo os resultados da Copa.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : !user ? (
        <LoginCTA next="/palpites" />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Target className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-foreground">Tela de palpites em construção</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Aqui você vai colocar o placar de cada jogo. O palpite trava no apito inicial.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Type-check**

Run: `pnpm type-check`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/features/auth/components/login-cta.tsx src/features/auth/components/login-cta.test.tsx src/features/auth/index.ts src/app/palpites/page.tsx
git commit -m "gate palpites behind google login"
```

---

## Task 7: Ligar o AuthProvider no layout

**Files:**

- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Envolver o AppShell com o AuthProvider**

Importe no topo:

```tsx
import { AuthProvider } from "@/features/auth";
```

E troque o trecho dos providers para:

```tsx
<MockProvider>
  <QueryProvider>
    <AuthProvider>
      <AppShell>{children}</AppShell>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  </QueryProvider>
</MockProvider>
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "wire auth provider into app layout"
```

---

## Task 8: Botão "Sair" no top-bar quando logado

**Files:**

- Modify: `src/widgets/app-shell/ui/top-bar.tsx`

- [ ] **Step 1: Mostrar "Sair" quando há usuário**

Transforme o `top-bar.tsx` em client component e use o estado de auth:

```tsx
"use client";

import { Bell, LogOut, Trophy } from "lucide-react";
import { useAuth } from "@/features/auth";
import { signOutUser } from "@/shared/lib/supabase";

/** Barra superior fixa: marca do bolão + sino + sair (quando logado). */
export function TopBar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            Bolão da Copa
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Notificações"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
          {user && (
            <button
              type="button"
              aria-label="Sair"
              onClick={() => signOutUser()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/widgets/app-shell/ui/top-bar.tsx
git commit -m "add sign-out button to top bar when logged in"
```

---

## Task 9: Configurar Google no Supabase + verificação ponta a ponta (manual)

Sem código. Feito junto com o usuário (ele tem acesso aos painéis).

- [ ] **Step 1: Google Cloud — credenciais OAuth**

No Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web):

- **Authorized JavaScript origins:** `http://localhost:3000` e a URL de produção.
- **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`.
- Anote **Client ID** e **Client Secret**.

- [ ] **Step 2: Supabase — habilitar Google**

Painel Supabase → Authentication → Providers → Google → Enable; cole Client ID/Secret → Save.

- [ ] **Step 3: Supabase — URLs de redirect do app**

Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000` (dev).
- **Redirect URLs:** adicione `http://localhost:3000/auth/callback` (e a de produção).

- [ ] **Step 4: Rodar o app e testar o fluxo**

Run: `pnpm dev`
Passos: abrir `/palpites` → ver `LoginCTA` → "Entrar com Google" → autorizar →
voltar logado em `/palpites` → ver o botão "Sair" no top-bar.
Expected: login completa e a UI reflete o estado logado.

- [ ] **Step 5: Verificar a auto-inscrição no banco**

Run (SQL):

```sql
select p.user_id, pr.nome
from public.participantes p
join public.profiles pr on pr.id = p.user_id
where p.bolao_id = '00000000-0000-0000-0000-000000000b01';
```

Expected: o usuário recém-logado aparece como participante do bolão padrão.

- [ ] **Step 6: Suíte completa + lint final**

Run: `pnpm vitest run && pnpm type-check`
Expected: tudo verde.

---

## Notas de execução

- **PT-BR** em todo texto visível; **sem `console.log`**; imports não usados removidos.
- Mensagens de commit em **inglês**, imperativo curto; **sem** menção a IA/Claude.
- **Não dar `git push`** — o push final é sempre do desenvolvedor humano.
- Ordem recomendada respeitando dependências: a Task 4 referencia `LoginCTA` na `index.ts`;
  ao executar a Task 4 isolada, deixe essa linha comentada e habilite-a na Task 6
  (ou execute 4→6 em sequência antes do type-check global).
