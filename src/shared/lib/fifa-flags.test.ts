import { describe, it, expect } from "vitest";
import { getFlagCode, FIFA_TO_ISO2 } from "./fifa-flags";

describe("getFlagCode", () => {
  it("converte um código FIFA conhecido para ISO-2 minúsculo", () => {
    expect(getFlagCode("BRA")).toBe("br");
    expect(getFlagCode("USA")).toBe("us");
  });

  it("é case-insensitive", () => {
    expect(getFlagCode("bra")).toBe("br");
    expect(getFlagCode("Bra")).toBe("br");
  });

  it("usa o formato gb-eng/gb-sct para Inglaterra e Escócia", () => {
    expect(getFlagCode("ENG")).toBe("gb-eng");
    expect(getFlagCode("SCO")).toBe("gb-sct");
  });

  it("retorna 'xx' para código desconhecido", () => {
    expect(getFlagCode("ZZZ")).toBe("xx");
    expect(getFlagCode("")).toBe("xx");
  });

  it("expõe o mapa FIFA → ISO-2", () => {
    expect(FIFA_TO_ISO2.ARG).toBe("ar");
    expect(FIFA_TO_ISO2.GER).toBe("de");
  });
});
