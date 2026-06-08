import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Captura o `value` passado ao QR para provar que ele é gerado EXATAMENTE a
// partir do BR Code canônico (e nunca de uma fonte dinâmica).
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value, title }: { value: string; title?: string }) => (
    <svg data-testid="qr" data-value={value} aria-label={title} />
  ),
}));

import { PIX_INSCRICAO } from "@/shared/lib/pix-inscricao";
import { BlocoPagamentoInscricao } from "./bloco-pagamento-inscricao";

describe("BlocoPagamentoInscricao", () => {
  beforeEach(() => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it("gera o QR a partir do BR Code canônico (sem fonte dinâmica)", () => {
    render(<BlocoPagamentoInscricao />);
    const qr = screen.getByTestId("qr");
    expect(qr.getAttribute("data-value")).toBe(PIX_INSCRICAO.brCode);
  });

  it("mostra recebedor, chave e o prazo de pagamento", () => {
    render(<BlocoPagamentoInscricao />);
    expect(screen.getByText(PIX_INSCRICAO.recebedor)).toBeInTheDocument();
    // A chave e o prazo aparecem em mais de um parágrafo do bloco.
    expect(screen.getAllByText(PIX_INSCRICAO.chaveFormatada).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(PIX_INSCRICAO.prazo)).length).toBeGreaterThan(0);
  });

  it("orienta enviar o comprovante para o contato do organizador", () => {
    render(<BlocoPagamentoInscricao />);
    expect(screen.getAllByText(/comprovante/i).length).toBeGreaterThan(0);
    expect(screen.getByText(PIX_INSCRICAO.contatoComprovanteFormatado)).toBeInTheDocument();
  });

  it("avisa que não pagantes são removidos do bolão na data do bate-confere", () => {
    render(<BlocoPagamentoInscricao />);
    // "removido do bolão" está num <span> destacado dentro do parágrafo.
    expect(screen.getAllByText(/removido do bolão/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/não participa/i)).toBeInTheDocument();
  });

  it("o campo copia e cola contém o BR Code exato", () => {
    render(<BlocoPagamentoInscricao />);
    const campo = screen.getByLabelText("Código PIX copia e cola") as HTMLInputElement;
    expect(campo.readOnly).toBe(true);
    expect(campo.value).toBe(PIX_INSCRICAO.brCode);
  });

  it("copia o BR Code para a área de transferência e dá feedback acessível", async () => {
    render(<BlocoPagamentoInscricao />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar código PIX" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(PIX_INSCRICAO.brCode);
    // O feedback ("Copiado!") aparece após o await da Clipboard API resolver.
    expect(await screen.findByRole("button", { name: "Código PIX copiado" })).toBeInTheDocument();
    expect(screen.getByText("Código PIX copiado para a área de transferência")).toBeInTheDocument();
  });
});
