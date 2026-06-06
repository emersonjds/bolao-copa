import { describe, it, expect } from "vitest";
import { BOLAO_PADRAO_ID } from "./constants";

describe("BOLAO_PADRAO_ID", () => {
  it("é o UUID fixo do bolão padrão da migration 0002", () => {
    expect(BOLAO_PADRAO_ID).toBe("00000000-0000-0000-0000-000000000b01");
  });

  it("tem formato de UUID v? canônico (8-4-4-4-12)", () => {
    expect(BOLAO_PADRAO_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});
