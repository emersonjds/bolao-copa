import { describe, it, expect } from "vitest";
import { AVISOS, type Gatilho } from "./aviso-atual";

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

  it("ordem: novidades, mata-mata, oitavas, quartas, semi, final", () => {
    expect(AVISOS.map((a) => a.id)).toEqual([
      "novidades-2026-06",
      "mata-mata-2026-06",
      "oitavas-2026",
      "quartas-2026",
      "semifinal-2026",
      "final-2026",
    ]);
  });

  it("avisos com gatilho têm gatilho válido", () => {
    for (const aviso of AVISOS) {
      if (aviso.gatilho !== undefined) {
        expect(GATILHOS_VALIDOS.has(aviso.gatilho)).toBe(true);
      }
    }
  });
});
