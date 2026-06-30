import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { salvarRascunho, lerRascunho, limparRascunho } from "./rascunho-local";

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("rascunho-local", () => {
  it("salva e lê um rascunho por usuário+partida", () => {
    salvarRascunho("u1", "p1", { mandante: "2", visitante: "1" });
    expect(lerRascunho("u1", "p1")).toEqual({ mandante: "2", visitante: "1" });
  });
  it("isola por usuário", () => {
    salvarRascunho("u1", "p1", { mandante: "2", visitante: "1" });
    expect(lerRascunho("u2", "p1")).toBeUndefined();
  });
  it("limpa o rascunho", () => {
    salvarRascunho("u1", "p1", { mandante: "2", visitante: "1" });
    limparRascunho("u1", "p1");
    expect(lerRascunho("u1", "p1")).toBeUndefined();
  });
  it("retorna undefined para dado corrompido", () => {
    localStorage.setItem("palpite-rascunho:u1:p1", "{nao-json");
    expect(lerRascunho("u1", "p1")).toBeUndefined();
  });
  it("retorna undefined quando não há rascunho", () => {
    expect(lerRascunho("u1", "pX")).toBeUndefined();
  });

  it("retorna undefined quando o JSON parseia mas não tem o formato de PlacarLocal", () => {
    // typeof obj !== "object" (número)
    localStorage.setItem("palpite-rascunho:u1:num", "42");
    expect(lerRascunho("u1", "num")).toBeUndefined();

    // obj === null
    localStorage.setItem("palpite-rascunho:u1:nulo", "null");
    expect(lerRascunho("u1", "nulo")).toBeUndefined();

    // objeto sem `mandante` string (ex.: array)
    localStorage.setItem("palpite-rascunho:u1:arr", JSON.stringify([1, 2]));
    expect(lerRascunho("u1", "arr")).toBeUndefined();

    // objeto sem `mandante` string
    localStorage.setItem("palpite-rascunho:u1:obj", JSON.stringify({ foo: 1 }));
    expect(lerRascunho("u1", "obj")).toBeUndefined();

    // `mandante` string mas `visitante` ausente
    localStorage.setItem("palpite-rascunho:u1:semVis", JSON.stringify({ mandante: "1" }));
    expect(lerRascunho("u1", "semVis")).toBeUndefined();
  });

  it("degrada (storage indisponível) quando window não existe — SSR", () => {
    vi.stubGlobal("window", undefined);

    expect(() => salvarRascunho("u1", "p1", { mandante: "1", visitante: "0" })).not.toThrow();
    expect(lerRascunho("u1", "p1")).toBeUndefined();
    expect(() => limparRascunho("u1", "p1")).not.toThrow();
  });

  it("degrada sem lançar quando o acesso ao localStorage é bloqueado (modo privado)", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });

    try {
      expect(() => salvarRascunho("u1", "p1", { mandante: "1", visitante: "0" })).not.toThrow();
      expect(lerRascunho("u1", "p1")).toBeUndefined();
      expect(() => limparRascunho("u1", "p1")).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
