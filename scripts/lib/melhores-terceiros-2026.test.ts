import { describe, it, expect } from "vitest";
import { atribuirTerceiros, CANDIDATOS_SLOT, type Grupo } from "./melhores-terceiros-2026";

const TODOS: Grupo[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
const SLOTS = Object.keys(CANDIDATOS_SLOT) as (keyof typeof CANDIDATOS_SLOT)[];

function combinacoes(arr: Grupo[], k: number): Grupo[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [head, ...rest] = arr;
  return [...combinacoes(rest, k - 1).map((c) => [head, ...c]), ...combinacoes(rest, k)];
}

describe("atribuirTerceiros — tabela oficial 2026", () => {
  it("resolve TODAS as 495 combinações (C(12,8)) sem conflito", () => {
    const combos = combinacoes(TODOS, 8);
    expect(combos).toHaveLength(495);
    for (const combo of combos) {
      const mapa = atribuirTerceiros(combo);
      const usados = SLOTS.map((s) => mapa[s]);
      for (const s of SLOTS) expect(CANDIDATOS_SLOT[s]).toContain(mapa[s]);
      expect(new Set(usados)).toEqual(new Set(combo));
      expect(usados).toHaveLength(8);
    }
  });

  it("exige exatamente 8 grupos distintos", () => {
    expect(() => atribuirTerceiros(["A", "B", "C"] as Grupo[])).toThrow();
    expect(() => atribuirTerceiros(["A", "A", "B", "C", "D", "E", "F", "G"] as Grupo[])).toThrow();
  });
});
