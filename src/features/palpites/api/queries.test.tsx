import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { createTestQueryClient } from "@/test/render";
import type { Palpite } from "@/entities/palpite";

// ---------------------------------------------------------------------------
// Mocks — vi.mock é içado antes dos imports pelo Vitest
// ---------------------------------------------------------------------------

// Mocka só useSupabaseUser; getSupabaseBrowserClient permanece real mas nunca
// é atingido porque palpites-fetcher também está mockado.
vi.mock("@/shared/lib/supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/supabase")>();
  return { ...actual, useSupabaseUser: vi.fn(() => null) };
});

// Isola os hooks da rede: os fetchers são testados separadamente.
vi.mock("./palpites-fetcher", () => ({
  buscarParticipanteId: vi.fn(),
  listarMeusPalpites: vi.fn(),
  salvarPalpite: vi.fn(),
}));

import { useSupabaseUser } from "@/shared/lib/supabase";
import { buscarParticipanteId, listarMeusPalpites, salvarPalpite } from "./palpites-fetcher";
import { useMeusPalpites, useSalvarPalpite, palpitesKeys } from "./queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeUser = { id: "user-test-1" } as User;

const palpiteFake: Palpite = {
  id: "p-1",
  participanteId: "part-id-1",
  partidaId: "part-1",
  golsMandante: 2,
  golsVisitante: 0,
  pontos: null,
};

function makeWrapper() {
  const qc = createTestQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  }
  return { Wrapper, qc };
}

// ---------------------------------------------------------------------------
// useMeusPalpites
// ---------------------------------------------------------------------------

describe("useMeusPalpites", () => {
  beforeEach(() => {
    vi.mocked(useSupabaseUser).mockReturnValue(null);
    vi.mocked(buscarParticipanteId).mockResolvedValue("part-id-1");
    vi.mocked(listarMeusPalpites).mockResolvedValue([]);
  });

  it("retorna data=undefined enquanto não há usuário logado (query disabled)", () => {
    vi.mocked(useSupabaseUser).mockReturnValue(null);
    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useMeusPalpites(), { wrapper: Wrapper });

    expect(result.current.data).toBeUndefined();
  });

  it("busca e retorna os palpites quando usuário e participanteId estão disponíveis", async () => {
    vi.mocked(useSupabaseUser).mockReturnValue(fakeUser);
    vi.mocked(listarMeusPalpites).mockResolvedValue([palpiteFake]);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useMeusPalpites(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(buscarParticipanteId).toHaveBeenCalledWith("user-test-1");
    expect(listarMeusPalpites).toHaveBeenCalledWith("part-id-1");
    expect(result.current.data).toEqual([palpiteFake]);
  });
});

// ---------------------------------------------------------------------------
// useSalvarPalpite
// ---------------------------------------------------------------------------

describe("useSalvarPalpite", () => {
  beforeEach(() => {
    vi.mocked(useSupabaseUser).mockReturnValue(null);
    vi.mocked(buscarParticipanteId).mockResolvedValue("part-id-1");
    vi.mocked(salvarPalpite).mockResolvedValue(undefined);
  });

  it("lança erro imediato quando participanteId não está disponível (sem usuário)", async () => {
    vi.mocked(useSupabaseUser).mockReturnValue(null);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useSalvarPalpite(), { wrapper: Wrapper });

    await expect(
      act(() =>
        result.current.mutateAsync({
          partidaId: "part-1",
          golsMandante: 1,
          golsVisitante: 0,
        })
      )
    ).rejects.toThrow("Participante não identificado");
  });

  it("chama salvarPalpite com o participanteId resolvido via cache seed", async () => {
    vi.mocked(useSupabaseUser).mockReturnValue(fakeUser);
    vi.mocked(salvarPalpite).mockResolvedValue(undefined);

    const qc = createTestQueryClient();
    // Alimenta o cache para pular a query de buscarParticipanteId e ter
    // participanteId disponível desde o primeiro render.
    qc.setQueryData(palpitesKeys.participanteId(fakeUser.id), "part-id-1");

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useSalvarPalpite(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        partidaId: "part-1",
        golsMandante: 1,
        golsVisitante: 0,
      });
    });

    expect(salvarPalpite).toHaveBeenCalledWith({
      participanteId: "part-id-1",
      partidaId: "part-1",
      golsMandante: 1,
      golsVisitante: 0,
    });
  });

  it("invoca invalidateQueries com a chave de palpites do participante ao salvar com sucesso (onSuccess)", async () => {
    vi.mocked(useSupabaseUser).mockReturnValue(fakeUser);
    vi.mocked(salvarPalpite).mockResolvedValue(undefined);

    const qc = createTestQueryClient();
    qc.setQueryData(palpitesKeys.participanteId(fakeUser.id), "part-id-1");
    const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

    function Wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(() => useSalvarPalpite(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        partidaId: "part-2",
        golsMandante: 2,
        golsVisitante: 1,
      });
    });

    // Garante que o branch `if (participanteId)` em onSuccess foi executado.
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: palpitesKeys.meus("part-id-1"),
      });
    });
  });
});
