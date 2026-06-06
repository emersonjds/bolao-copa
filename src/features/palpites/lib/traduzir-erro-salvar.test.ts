import { describe, it, expect } from "vitest";
import { traduzirErroSalvar } from "./traduzir-erro-salvar";

describe("traduzirErroSalvar", () => {
  it("trata a trava de horário (partida já começou) como lock amigável", () => {
    const r = traduzirErroSalvar(
      "Falha ao salvar palpite: Palpite encerrado: a partida já começou"
    );
    expect(r.tipo).toBe("lock");
    expect(r.texto).toMatch(/já começou/i);
    expect(r.texto).not.toMatch(/erro|exception|42501/i);
  });

  it("trata permission denied / 42501 como problema de permissão", () => {
    const r = traduzirErroSalvar("permission denied for table palpites");
    expect(r.tipo).toBe("permissao");
  });

  it("trata falha de rede", () => {
    const r = traduzirErroSalvar("TypeError: Failed to fetch");
    expect(r.tipo).toBe("rede");
  });

  it("cai no genérico para erros desconhecidos", () => {
    const r = traduzirErroSalvar("algo inesperado aconteceu");
    expect(r.tipo).toBe("generico");
  });
});
