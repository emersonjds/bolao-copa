import { describe, expect, it } from "vitest";
import { PIX_INSCRICAO, verificarCrcPix } from "./pix-inscricao";

describe("PIX_INSCRICAO (constante canônica)", () => {
  it("o BR Code é um payload EMV PIX (header + GUI do Banco Central)", () => {
    expect(PIX_INSCRICAO.brCode.startsWith("000201")).toBe(true);
    expect(PIX_INSCRICAO.brCode).toContain("br.gov.bcb.pix");
  });

  it("roteia o pagamento para a chave-telefone do recebedor", () => {
    // A chave é o que define PARA QUEM o dinheiro vai — o campo crítico.
    expect(PIX_INSCRICAO.brCode).toContain("+5511948772834");
  });

  it("expõe recebedor, chave e prazo esperados", () => {
    expect(PIX_INSCRICAO.recebedor).toBe("JOAO GUSTAVO TOMAZ BARBOSA");
    expect(PIX_INSCRICAO.chave).toBe("11948772834");
    expect(PIX_INSCRICAO.chaveFormatada).toBe("11 94877-2834");
    expect(PIX_INSCRICAO.prazo).toBe("10/06/2026");
  });

  it("expõe o contato para envio do comprovante", () => {
    expect(PIX_INSCRICAO.contatoComprovante).toBe("11971801555");
    expect(PIX_INSCRICAO.contatoComprovanteFormatado).toBe("11 97180-1555");
  });
});

describe("verificarCrcPix (integridade anti-adulteração)", () => {
  it("aceita o BR Code canônico (CRC16 confere)", () => {
    expect(verificarCrcPix(PIX_INSCRICAO.brCode)).toBe(true);
  });

  it("rejeita troca da chave sem recomputar o CRC (desvio de pagamento)", () => {
    // Atacante troca o último dígito da chave para desviar o PIX, mas mantém o
    // CRC original: a verificação tem que reprovar.
    const adulterado = PIX_INSCRICAO.brCode.replace("+5511948772834", "+5511948772835");
    expect(adulterado).not.toBe(PIX_INSCRICAO.brCode);
    expect(verificarCrcPix(adulterado)).toBe(false);
  });

  it("rejeita troca do nome do recebedor sem recomputar o CRC", () => {
    const adulterado = PIX_INSCRICAO.brCode.replace("JOAO GUSTAVO", "JOSE ROBERTO");
    expect(verificarCrcPix(adulterado)).toBe(false);
  });

  it("rejeita um CRC declarado incorreto", () => {
    const corpo = PIX_INSCRICAO.brCode.slice(0, -4);
    expect(verificarCrcPix(`${corpo}0000`)).toBe(false);
  });

  it("rejeita strings curtas demais para conter um CRC", () => {
    expect(verificarCrcPix("12")).toBe(false);
    expect(verificarCrcPix("")).toBe(false);
  });
});
