import { describe, it, expect, vi } from "vitest";
import { type ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/render";

vi.mock("./contagem-inscritos", () => ({ contarInscritos: vi.fn() }));
import { contarInscritos } from "./contagem-inscritos";
import { useContagemInscritos, premiacaoKeys } from "./queries";

function makeWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useContagemInscritos", () => {
  it("expõe a chave de cache estável", () => {
    expect(premiacaoKeys.inscritos).toEqual(["premiacao", "inscritos"]);
  });

  it("carrega a contagem de inscritos", async () => {
    vi.mocked(contarInscritos).mockResolvedValue(87);
    const { result } = renderHook(() => useContagemInscritos(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(87);
  });
});
