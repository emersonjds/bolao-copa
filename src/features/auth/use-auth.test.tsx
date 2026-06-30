import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, type AuthState } from "./auth-context";
import { useAuth, useUser, useSession } from "./use-auth";
import { fakeUser } from "@/test/render";

function makeWrapper(value: AuthState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };
}

describe("useAuth", () => {
  it("lança erro quando usado fora do AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow(/dentro de <AuthProvider>/);
  });

  it("retorna o estado completo quando logado", () => {
    const user = fakeUser();
    const session = { user } as Session;
    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper({ session, user, loading: false }),
    });

    expect(result.current.user).toBe(user);
    expect(result.current.session).toBe(session);
    expect(result.current.loading).toBe(false);
  });

  it("retorna user e session nulos quando deslogado", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper({ session: null, user: null, loading: false }),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("reflete o estado de carregamento", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: makeWrapper({ session: null, user: null, loading: true }),
    });

    expect(result.current.loading).toBe(true);
  });
});

describe("useUser", () => {
  it("retorna o usuário logado", () => {
    const user = fakeUser();
    const { result } = renderHook(() => useUser(), {
      wrapper: makeWrapper({ session: { user } as Session, user, loading: false }),
    });
    expect(result.current).toBe(user);
  });

  it("retorna null quando deslogado", () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: makeWrapper({ session: null, user: null, loading: false }),
    });
    expect(result.current).toBeNull();
  });
});

describe("useSession", () => {
  it("retorna a sessão atual", () => {
    const user = fakeUser();
    const session = { user } as Session;
    const { result } = renderHook(() => useSession(), {
      wrapper: makeWrapper({ session, user, loading: false }),
    });
    expect(result.current).toBe(session);
  });

  it("retorna null quando não há sessão", () => {
    const { result } = renderHook(() => useSession(), {
      wrapper: makeWrapper({ session: null, user: null, loading: false }),
    });
    expect(result.current).toBeNull();
  });
});
