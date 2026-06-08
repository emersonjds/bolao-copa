import { beforeEach, describe, expect, it } from "vitest";
import { salvarRascunho, lerRascunho, limparRascunho } from "./rascunho-local";

beforeEach(() => localStorage.clear());

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
});
