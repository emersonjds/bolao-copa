import { describe, expect, it, vi } from "vitest";

vi.mock("@/shared/lib/supabase", () => ({
  getSupabaseBrowserClient: vi.fn(),
}));

import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { contarInscritos } from "./contagem-inscritos";

function mockCount(count: number | null, error: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ count, error });
  const select = vi.fn().mockReturnValue({ eq });
  vi.mocked(getSupabaseBrowserClient).mockReturnValue({
    from: vi.fn().mockReturnValue({ select }),
  } as unknown as ReturnType<typeof getSupabaseBrowserClient>);
}

describe("contarInscritos", () => {
  it("retorna a contagem de participantes do bolão", async () => {
    mockCount(87);
    expect(await contarInscritos()).toBe(87);
  });
  it("retorna 0 quando count é null", async () => {
    mockCount(null);
    expect(await contarInscritos()).toBe(0);
  });
  it("lança em caso de erro", async () => {
    mockCount(null, { message: "boom" });
    await expect(contarInscritos()).rejects.toThrow(/boom/);
  });
});
