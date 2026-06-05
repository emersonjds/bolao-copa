import { describe, it, expect } from "vitest";
import {
  parseKickoffToUtc,
  roundToFase,
  parseGroup,
  isPlaceholderTeam,
  fifaCode,
} from "./transform";

describe("parseKickoffToUtc", () => {
  it("converte horário com offset UTC-6 para UTC", () => {
    expect(parseKickoffToUtc("2026-06-11", "13:00 UTC-6")).toBe("2026-06-11T19:00:00.000Z");
  });
  it("converte horário com offset UTC-4 para UTC", () => {
    expect(parseKickoffToUtc("2026-06-18", "12:00 UTC-4")).toBe("2026-06-18T16:00:00.000Z");
  });
});

describe("roundToFase", () => {
  it("mapeia matchdays para grupos", () => {
    expect(roundToFase("Matchday 1")).toBe("grupos");
    expect(roundToFase("Matchday 17")).toBe("grupos");
  });
  it("mapeia as fases de mata-mata", () => {
    expect(roundToFase("Round of 32")).toBe("trinta-e-dois");
    expect(roundToFase("Round of 16")).toBe("oitavas");
    expect(roundToFase("Quarter-final")).toBe("quartas");
    expect(roundToFase("Semi-final")).toBe("semifinal");
    expect(roundToFase("Match for third place")).toBe("terceiro-lugar");
    expect(roundToFase("Final")).toBe("final");
  });
});

describe("parseGroup", () => {
  it("extrai a letra do grupo", () => {
    expect(parseGroup("Group A")).toBe("A");
    expect(parseGroup("Group L")).toBe("L");
  });
  it("devolve null quando não há grupo (mata-mata)", () => {
    expect(parseGroup(undefined)).toBeNull();
  });
});

describe("isPlaceholderTeam", () => {
  it("reconhece placeholders de posição e de vencedor", () => {
    expect(isPlaceholderTeam("2A")).toBe(true);
    expect(isPlaceholderTeam("1E")).toBe(true);
    expect(isPlaceholderTeam("3A/B/C/D/F")).toBe(true);
    expect(isPlaceholderTeam("W74")).toBe(true);
    expect(isPlaceholderTeam("L101")).toBe(true);
  });
  it("não marca seleções reais como placeholder", () => {
    expect(isPlaceholderTeam("Brazil")).toBe(false);
    expect(isPlaceholderTeam("South Korea")).toBe(false);
  });
});

describe("fifaCode", () => {
  it("devolve o código FIFA de uma seleção conhecida", () => {
    expect(fifaCode("Brazil")).toBe("BRA");
    expect(fifaCode("Ivory Coast")).toBe("CIV");
  });
  it("lança erro barulhento para seleção desconhecida", () => {
    expect(() => fifaCode("Atlantis")).toThrow(/Atlantis/);
  });
});
