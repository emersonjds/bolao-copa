import { type ReactElement, type ReactNode } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { AuthContext } from "@/features/auth/auth-context";

/**
 * Helpers de render para testes de componente.
 *
 * Padrões de auth nos testes:
 *  - Componentes que usam `useAuth()` (contexto): passe `{ user }` aqui — o
 *    AuthContext é injetado, sem tocar na rede.
 *  - Componentes que usam `useSupabaseUser()/useIsAdmin()/useMeuParticipanteId()`
 *    (chamam o Supabase direto): faça `vi.mock` desses hooks no teste, pois o
 *    supabase-js curto-circuita o getUser sem sessão persistida.
 *  - Dados de fetchers (useQuery): simule a REST com `server.use(restList(...))`.
 */

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  user?: User | null;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  { user = null, queryClient, ...options }: RenderWithProvidersOptions = {}
) {
  const client = queryClient ?? createTestQueryClient();
  const session = user ? ({ user } as Session) : null;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={{ session, user, loading: false }}>
          {children}
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }

  return { queryClient: client, ...render(ui, { wrapper: Wrapper, ...options }) };
}

/** Usuário Supabase falso para testes que precisam de sessão logada. */
export function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-test-1",
    aud: "authenticated",
    role: "authenticated",
    email: "tester@bolao.test",
    app_metadata: {},
    user_metadata: { full_name: "Tester" },
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as User;
}
