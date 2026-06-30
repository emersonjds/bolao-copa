import { describe, it, expect } from "vitest";
import { type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/render";
import { server } from "@/test/msw/server";
import { restList, restError } from "@/test/msw/handlers";
import { partidaDb } from "@/test/fixtures";
import { usePartidas, partidasKeys } from "./queries";

function makeWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("usePartidas", () => {
  it("expõe a chave de cache estável", () => {
    expect(partidasKeys.all).toEqual(["partidas"]);
  });

  it("carrega e mapeia as partidas do Supabase", async () => {
    server.use(restList("partidas", [partidaDb]));
    const { result } = renderHook(() => usePartidas(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].mandante.nome).toBe("México");
  });

  it("expõe estado de erro quando a query falha", async () => {
    server.use(restError("partidas", { status: 500, message: "boom" }));
    const { result } = renderHook(() => usePartidas(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
