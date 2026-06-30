import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  it("avisoVistoLocal retorna false quando getItem lança", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementationOnce(() => {
      throw new DOMException("SecurityError");
    });
    expect(avisoVistoLocal("novidades-2026-06")).toBe(false);
  });

  it("marcarAvisoVistoLocal não lança quando setItem lança", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
      throw new DOMException("SecurityError");
    });
    expect(() => marcarAvisoVistoLocal("novidades-2026-06")).not.toThrow();
  });

  describe("quando window.localStorage lança ao ser acessado (modo privado/bloqueado)", () => {
    let storageOriginal: Storage;

    beforeEach(() => {
      storageOriginal = window.localStorage;
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("SecurityError");
        },
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          return storageOriginal;
        },
        configurable: true,
      });
    });

    it("avisoVistoLocal retorna false sem lançar", () => {
      expect(avisoVistoLocal("novidades-2026-06")).toBe(false);
    });

    it("marcarAvisoVistoLocal não lança", () => {
      expect(() => marcarAvisoVistoLocal("novidades-2026-06")).not.toThrow();
    });
  });

  describe("quando não há window (SSR / static export)", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("avisoVistoLocal retorna false e marcar não lança", () => {
      vi.stubGlobal("window", undefined);
      expect(avisoVistoLocal("novidades-2026-06")).toBe(false);
      expect(() => marcarAvisoVistoLocal("novidades-2026-06")).not.toThrow();
    });
  });
});
