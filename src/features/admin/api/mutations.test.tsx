import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { server } from "@/test/msw/server";
import { restWrite, restError } from "@/test/msw/handlers";
import { createTestQueryClient } from "@/test/render";
import { useSalvarResultado, useDefinirConfronto } from "./mutations";

// O toast (sonner) é efeito colateral das mutations — mockamos para asserir
// sucesso/erro sem renderizar o componente real do toast.
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useSalvarResultado (integração Supabase via MSW)", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    client.clear();
  });

  it("salva o resultado, dispara toast de sucesso e invalida as queries", async () => {
    server.use(restWrite("partidas", { method: "patch", status: 204 }));
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSalvarResultado(), {
      wrapper: createWrapper(client),
    });

    result.current.mutate({
      partidaId: "part-1",
      golsMandante: 2,
      golsVisitante: 1,
      status: "encerrada",
      vencedorPenaltis: null,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith("Resultado salvo! Pontos apurados automaticamente.");
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["partidas"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["ranking"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["destaque-rodada"] });
  });

  it("dispara toast de erro quando o PATCH falha (403 RLS)", async () => {
    server.use(
      restError("partidas", {
        method: "patch",
        status: 403,
        message: "permission denied",
      })
    );
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useSalvarResultado(), {
      wrapper: createWrapper(client),
    });

    result.current.mutate({
      partidaId: "part-1",
      golsMandante: 0,
      golsVisitante: 0,
      status: "agendada",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith("Erro ao salvar resultado: permission denied");
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe("useDefinirConfronto (integração Supabase via MSW)", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = createTestQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    client.clear();
  });

  it("define o confronto, dispara toast de sucesso e invalida ['partidas']", async () => {
    server.use(restWrite("partidas", { method: "patch", status: 204 }));
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const { result } = renderHook(() => useDefinirConfronto(), {
      wrapper: createWrapper(client),
    });

    result.current.mutate({
      partidaId: "part-ko",
      mandanteId: "sel-mex",
      visitanteId: "sel-rsa",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(toast.success).toHaveBeenCalledWith("Confronto definido com sucesso.");
    expect(toast.error).not.toHaveBeenCalled();
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["partidas"] });
  });

  it("dispara toast de erro quando o PATCH falha", async () => {
    server.use(
      restError("partidas", {
        method: "patch",
        status: 403,
        message: "violates row-level security",
      })
    );

    const { result } = renderHook(() => useDefinirConfronto(), {
      wrapper: createWrapper(client),
    });

    result.current.mutate({
      partidaId: "part-ko",
      mandanteId: "sel-mex",
      visitanteId: "sel-rsa",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).toHaveBeenCalledWith(
      "Erro ao definir confronto: violates row-level security"
    );
    expect(toast.success).not.toHaveBeenCalled();
  });
});
