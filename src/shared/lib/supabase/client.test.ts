import { describe, it, expect, afterEach, vi } from "vitest";
import { getSupabaseBrowserClient } from "./client";

describe("getSupabaseBrowserClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("devolve o mesmo singleton em chamadas repetidas", () => {
    const primeiro = getSupabaseBrowserClient();
    const segundo = getSupabaseBrowserClient();
    expect(primeiro).toBe(segundo);
  });

  it("expõe a API esperada do client (auth, from)", () => {
    const client = getSupabaseBrowserClient();
    expect(typeof client.auth).toBe("object");
    expect(typeof client.from).toBe("function");
  });

  it("lança erro quando NEXT_PUBLIC_SUPABASE_URL está ausente", () => {
    // A verificação de env acontece antes do singleton, então o erro dispara
    // mesmo com o client já criado por testes anteriores.
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(() => getSupabaseBrowserClient()).toThrow(/Supabase não configurado/);
  });

  it("lança erro quando NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY está ausente", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(() => getSupabaseBrowserClient()).toThrow(/Supabase não configurado/);
  });
});
