import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { fakeUser } from "@/test/render";

const getUser = vi.fn();
const onAuthStateChange = vi.fn();
const unsubscribe = vi.fn();

type AuthCallback = (event: string, session: Session | null) => void;
let captured: AuthCallback | undefined;

vi.mock("./client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { getUser, onAuthStateChange } }),
}));

import { useSupabaseUser } from "./use-user";

beforeEach(() => {
  getUser.mockReset();
  onAuthStateChange.mockReset();
  unsubscribe.mockReset();
  captured = undefined;
  onAuthStateChange.mockImplementation((cb: AuthCallback) => {
    captured = cb;
    return { data: { subscription: { unsubscribe } } };
  });
});

describe("useSupabaseUser", () => {
  it("carrega o usuário da sessão persistida", async () => {
    const user = fakeUser();
    getUser.mockResolvedValue({ data: { user } });

    const { result } = renderHook(() => useSupabaseUser());

    await waitFor(() => expect(result.current).toEqual(user));
  });

  it("retorna null quando não há sessão", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useSupabaseUser());

    await waitFor(() => expect(getUser).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("retorna null quando getUser rejeita", async () => {
    getUser.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useSupabaseUser());

    await waitFor(() => expect(getUser).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("atualiza o estado em login (onAuthStateChange)", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useSupabaseUser());
    await waitFor(() => expect(captured).toBeDefined());

    const user = fakeUser();
    act(() => captured!("SIGNED_IN", { user } as Session));

    expect(result.current).toEqual(user);
  });

  it("limpa o estado em logout (session null)", async () => {
    getUser.mockResolvedValue({ data: { user: fakeUser() } });
    const { result } = renderHook(() => useSupabaseUser());
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => captured!("SIGNED_OUT", null));

    expect(result.current).toBeNull();
  });

  it("usa null quando o evento traz sessão sem user", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { result } = renderHook(() => useSupabaseUser());
    await waitFor(() => expect(captured).toBeDefined());

    act(() => captured!("TOKEN_REFRESHED", {} as Session));

    expect(result.current).toBeNull();
  });

  it("cancela a assinatura ao desmontar", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const { unmount } = renderHook(() => useSupabaseUser());
    await waitFor(() => expect(onAuthStateChange).toHaveBeenCalled());

    unmount();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
