import { describe, it, expect, beforeEach } from "vitest";
import { jaConfirmouAntecipado, marcarConfirmouAntecipado } from "./confirmacao-antecipado";

describe("confirmacao-antecipado", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
