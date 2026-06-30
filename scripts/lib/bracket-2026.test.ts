import { describe, it, expect } from "vitest";
import { BRACKET_2026, partidaPorNumero } from "./bracket-2026";

const REF = /^([WL])(\d+)$/;

describe("BRACKET_2026", () => {
  it("tem 32 partidas numeradas 73..104 sem repetição", () => {
    const nums = BRACKET_2026.map((p) => p.numero).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 32 }, (_, i) => 73 + i));
  });

  it("toda referência W{n}/L{n} aponta para uma partida existente de número menor", () => {
    for (const p of BRACKET_2026) {
      for (const label of [p.mandanteLabel, p.visitanteLabel]) {
        const m = label.match(REF);
        if (!m) continue; // rótulo de grupo (1A/2B/3...), só nas 32-avos
        const alvo = partidaPorNumero(Number(m[2]));
        expect(alvo, `${label} em #${p.numero}`).toBeDefined();
        expect(alvo!.numero).toBeLessThan(p.numero);
      }
    }
  });

  // 73–100 referidos 1 vez cada; 101 e 102 referidos 2 vezes cada (W→final, L→3º lugar).
  it("forma árvore de eliminação simples: 73..100 referidos 1 vez; 101 e 102 referidos 2 vezes", () => {
    const refs = new Map<number, number>();
    for (const p of BRACKET_2026) {
      for (const label of [p.mandanteLabel, p.visitanteLabel]) {
        const m = label.match(REF);
        if (m) refs.set(Number(m[2]), (refs.get(Number(m[2])) ?? 0) + 1);
      }
    }
    for (let n = 73; n <= 100; n++) expect(refs.get(n), `#${n}`).toBe(1);
    expect(refs.get(101)).toBe(2);
    expect(refs.get(102)).toBe(2);
  });

  it("perdedores das semis (101,102) alimentam o 3º lugar; vencedores, a final", () => {
    const terceiro = BRACKET_2026.find((p) => p.fase === "terceiro-lugar")!;
    const final = BRACKET_2026.find((p) => p.fase === "final")!;
    expect([terceiro.mandanteLabel, terceiro.visitanteLabel].sort()).toEqual(["L101", "L102"]);
    expect([final.mandanteLabel, final.visitanteLabel].sort()).toEqual(["W101", "W102"]);
  });

  it("conta por fase: 16 32-avos, 8 oitavas, 4 quartas, 2 semis, 1 terceiro, 1 final", () => {
    const por = (f: string) => BRACKET_2026.filter((p) => p.fase === f).length;
    expect([por("trinta-e-dois"), por("oitavas"), por("quartas"), por("semifinal"), por("terceiro-lugar"), por("final")])
      .toEqual([16, 8, 4, 2, 1, 1]);
  });
});
