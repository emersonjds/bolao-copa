import { describe, expect, it } from "vitest";
import { dividirPote } from "./calcular-divisao";

describe("dividirPote", () => {
  it("divide 1000 em 500/300/200", () => {
    expect(dividirPote(1000)).toEqual({ primeiro: 500, segundo: 300, terceiro: 200 });
  });
  it("a soma das partes é sempre igual ao pote (sem vazar centavos)", () => {
    for (const pote of [1000, 870, 333, 1, 9999]) {
      const d = dividirPote(pote);
      expect(d.primeiro + d.segundo + d.terceiro).toBe(pote);
    }
  });
  it("pote 0 → tudo 0", () => {
    expect(dividirPote(0)).toEqual({ primeiro: 0, segundo: 0, terceiro: 0 });
  });
  it("o 1º nunca recebe menos que o 2º, e o 2º não menos que o 3º", () => {
    const d = dividirPote(871);
    expect(d.primeiro).toBeGreaterThanOrEqual(d.segundo);
    expect(d.segundo).toBeGreaterThanOrEqual(d.terceiro);
  });
});
