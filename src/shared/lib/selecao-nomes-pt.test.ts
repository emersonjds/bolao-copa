import { describe, it, expect } from "vitest";
import { nomeSelecaoPt, nomeCurtoSelecao, NOMES_SELECAO_PT } from "./selecao-nomes-pt";

describe("nomeSelecaoPt", () => {
  it("traduz um código FIFA conhecido para PT-BR", () => {
    expect(nomeSelecaoPt("BRA", "Brazil")).toBe("Brasil");
    expect(nomeSelecaoPt("GER", "Germany")).toBe("Alemanha");
  });

  it("é case-insensitive (normaliza para maiúsculas)", () => {
    expect(nomeSelecaoPt("bra", "Brazil")).toBe("Brasil");
    expect(nomeSelecaoPt("Bra", "Brazil")).toBe("Brasil");
  });

  it("usa o fallback para código desconhecido", () => {
    expect(nomeSelecaoPt("XYZ", "Atlantis")).toBe("Atlantis");
  });

  it("usa o fallback quando o código é null", () => {
    expect(nomeSelecaoPt(null, "A definir")).toBe("A definir");
  });

  it("usa o fallback quando o código é undefined", () => {
    expect(nomeSelecaoPt(undefined, "A definir")).toBe("A definir");
  });

  it("usa o fallback quando o código é string vazia", () => {
    expect(nomeSelecaoPt("", "A definir")).toBe("A definir");
  });

  it("expõe o mapa com nomes em PT-BR", () => {
    expect(NOMES_SELECAO_PT.MEX).toBe("México");
    expect(NOMES_SELECAO_PT.USA).toBe("Estados Unidos");
  });
});

describe("nomeCurtoSelecao", () => {
  it("abrevia nomes longos pelo código FIFA", () => {
    expect(nomeCurtoSelecao("CZE", "Czech Republic")).toBe("R. Tcheca");
    expect(nomeCurtoSelecao("CIV", "Ivory Coast")).toBe("C. Marfim");
    expect(nomeCurtoSelecao("USA", "United States")).toBe("EUA");
  });

  it("cai no nome PT-BR completo quando não há abreviação", () => {
    expect(nomeCurtoSelecao("BRA", "Brazil")).toBe("Brasil");
    expect(nomeCurtoSelecao("MEX", "Mexico")).toBe("México");
  });

  it("usa o fallback para código desconhecido", () => {
    expect(nomeCurtoSelecao("XYZ", "Atlantis")).toBe("Atlantis");
  });
});
