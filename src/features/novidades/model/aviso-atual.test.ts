import { describe, it, expect } from "vitest";
import { AVISOS, AVISO_CHAVEAMENTO, type Gatilho } from "./aviso-atual";

const GATILHOS_VALIDOS = new Set<Gatilho>([
  "mata-mata-definido",
  "oitavas-definido",
  "quartas-definido",
  "semifinal-definido",
  "final-definido",
]);

describe("AVISOS", () => {
  it("cada aviso tem id, titulo e itens não vazios", () => {
    for (const aviso of AVISOS) {
      expect(aviso.id).toBeTruthy();
      expect(aviso.titulo).toBeTruthy();
      expect(aviso.itens.length).toBeGreaterThan(0);
    }
  });

  it("sem ids duplicados", () => {
    const ids = AVISOS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ordem: novidades, mata-mata, oitavas, quartas, semi, final, pontuacao-mata-mata, chaveamento", () => {
    expect(AVISOS.map((a) => a.id)).toEqual([
      "novidades-2026-06",
      "mata-mata-2026-06",
      "oitavas-2026",
      "quartas-2026",
      "semifinal-2026",
      "final-2026",
      "pontuacao-mata-mata-2026-06",
      "chaveamento-2026",
    ]);
  });

  it("chaveamento é o último aviso em AVISOS", () => {
    expect(AVISOS.at(-1)?.id).toBe("chaveamento-2026");
  });

  it("AVISO_CHAVEAMENTO tem id, gatilho e itens corretos", () => {
    expect(AVISO_CHAVEAMENTO.id).toBe("chaveamento-2026");
    expect(AVISO_CHAVEAMENTO.gatilho).toBe("mata-mata-definido");
    expect(AVISO_CHAVEAMENTO.itens).toHaveLength(2);
  });

  it("avisos com gatilho têm gatilho válido", () => {
    for (const aviso of AVISOS) {
      if (aviso.gatilho !== undefined) {
        expect(GATILHOS_VALIDOS.has(aviso.gatilho)).toBe(true);
      }
    }
  });
});
