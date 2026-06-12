import { describe, it, expect, beforeEach } from "vitest";
import { avisoVistoLocal, marcarAvisoVistoLocal } from "./aviso-local";

describe("aviso-local", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("começa como não visto", () => {
    expect(avisoVistoLocal("novidades-2026-06")).toBe(false);
  });

  it("marca e lê por aviso_id", () => {
    marcarAvisoVistoLocal("novidades-2026-06");
    expect(avisoVistoLocal("novidades-2026-06")).toBe(true);
    // Outro aviso continua não visto.
    expect(avisoVistoLocal("outro-aviso")).toBe(false);
  });

  it("persiste com chave prefixada por aviso_id", () => {
    marcarAvisoVistoLocal("novidades-2026-06");
    expect(localStorage.getItem("aviso-visto:novidades-2026-06")).toBe("1");
  });
});
