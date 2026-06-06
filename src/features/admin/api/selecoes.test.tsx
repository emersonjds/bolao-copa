import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { server } from "@/test/msw/server";
import { restList, restError } from "@/test/msw/handlers";
import { createTestQueryClient } from "@/test/render";
import { selecaoMexicoDb, selecaoAfricaDb } from "@/test/fixtures";
import { useSelecoes } from "./selecoes";

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useSelecoes (integração Supabase via MSW)", () => {
  let client: QueryClient;

  beforeEach(() => {
    client = createTestQueryClient();
  });

  afterEach(() => {
    client.clear();
  });

  it("mapeia as seleções preservando a ordem retornada pelo banco", async () => {
    server.use(restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]));

    const { result } = renderHook(() => useSelecoes(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: "sel-mex", nome: "Mexico", codigo: "MEX" },
      { id: "sel-rsa", nome: "South Africa", codigo: "RSA" },
    ]);
  });

  it("retorna lista vazia quando não há seleções", async () => {
    server.use(restList("selecoes", []));

    const { result } = renderHook(() => useSelecoes(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("propaga erro amigável quando a leitura falha", async () => {
    server.use(restError("selecoes", { status: 500, message: "boom interno" }));

    const { result } = renderHook(() => useSelecoes(), {
      wrapper: createWrapper(client),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toMatch(/Falha ao carregar seleções/);
    expect(result.current.error?.message).toMatch(/boom interno/);
  });
});
