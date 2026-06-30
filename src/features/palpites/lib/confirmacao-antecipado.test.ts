import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { jaConfirmouAntecipado, marcarConfirmouAntecipado } from "./confirmacao-antecipado";

describe("confirmacao-antecipado", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("começa como não confirmado", () => {
    expect(jaConfirmouAntecipado("user-1")).toBe(false);
  });

  it("marca e lê a confirmação por usuário", () => {
    marcarConfirmouAntecipado("user-1");
    expect(jaConfirmouAntecipado("user-1")).toBe(true);
    // Outro usuário não herda a confirmação.
    expect(jaConfirmouAntecipado("user-2")).toBe(false);
  });

  it("persiste no localStorage com chave por usuário", () => {
    marcarConfirmouAntecipado("user-1");
    expect(localStorage.getItem("palpite-antecipado-confirmado:user-1")).toBe("1");
  });

  // ── Caminhos de degradação ─────────────────────────────────────────────────

  it("degrada quando window não está disponível (SSR)", () => {
    vi.stubGlobal("window", undefined);
    expect(jaConfirmouAntecipado("user-1")).toBe(false);
    expect(() => marcarConfirmouAntecipado("user-1")).not.toThrow();
  });

  it("degrada quando o acesso ao localStorage é bloqueado pelo navegador (modo privado)", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("SecurityError: blocked");
      },
    });
    try {
      expect(jaConfirmouAntecipado("user-1")).toBe(false);
      expect(() => marcarConfirmouAntecipado("user-1")).not.toThrow();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });

  it("retorna false quando getItem lança mesmo com storage disponível", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      expect(jaConfirmouAntecipado("user-1")).toBe(false);
    } finally {
      Storage.prototype.getItem = original;
    }
  });

  it("não lança quando setItem falha (ex.: cota cheia no navegador)", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };
    try {
      expect(() => marcarConfirmouAntecipado("user-1")).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});
