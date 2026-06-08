"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CalendarClock, Check, Copy } from "lucide-react";
import { PIX_INSCRICAO } from "@/shared/lib/pix-inscricao";

/**
 * Bloco de pagamento da inscrição via PIX. O QR e o "copia e cola" derivam da
 * mesma constante canônica (PIX_INSCRICAO.brCode) — não há prop nem fonte
 * dinâmica de payload, então não há superfície para injetar outro destino.
 */
export function BlocoPagamentoInscricao() {
  const [copiado, setCopiado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function copiar(): Promise<void> {
    try {
      await navigator.clipboard.writeText(PIX_INSCRICAO.brCode);
    } catch {
      // Fallback p/ WebView/navegadores sem Clipboard API: seleciona e copia.
      inputRef.current?.select();
      document.execCommand("copy");
    }
    setCopiado(true);
    window.setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <section
      aria-labelledby="pagamento-inscricao"
      className="rounded-2xl border border-brand-200 bg-card p-4 shadow-sm"
    >
      <h2
        id="pagamento-inscricao"
        className="flex items-center gap-2 font-display text-base font-bold text-foreground"
      >
        <CalendarClock className="h-4 w-4 shrink-0 text-brand-700" aria-hidden="true" />
        Pagamento da inscrição
      </h2>

      <p className="mt-1.5 text-sm text-muted-foreground">
        Garanta sua vaga: pague a inscrição via PIX{" "}
        <span className="font-semibold text-brand-800">até {PIX_INSCRICAO.prazo}</span>. Escaneie o
        QR Code ou use o PIX copia e cola.
      </p>

      <div className="mt-4 flex flex-col items-center gap-3">
        <div className="rounded-2xl border border-border bg-white p-3">
          <QRCodeSVG
            value={PIX_INSCRICAO.brCode}
            size={176}
            level="M"
            title="QR Code PIX para pagamento da inscrição"
          />
        </div>

        <dl className="w-full max-w-sm space-y-1 text-center text-sm">
          <div>
            <dt className="sr-only">Recebedor</dt>
            <dd className="font-semibold text-foreground">{PIX_INSCRICAO.recebedor}</dd>
          </div>
          <div>
            <dt className="sr-only">Chave PIX</dt>
            <dd className="text-muted-foreground">
              Chave (telefone): <span className="font-mono">{PIX_INSCRICAO.chaveFormatada}</span>
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4">
        <label
          htmlFor="pix-copia-cola"
          className="mb-1 block text-xs font-semibold text-foreground"
        >
          PIX copia e cola
        </label>
        <div className="flex gap-2">
          <input
            id="pix-copia-cola"
            ref={inputRef}
            readOnly
            value={PIX_INSCRICAO.brCode}
            aria-label="Código PIX copia e cola"
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 truncate rounded-xl border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => void copiar()}
            aria-label={copiado ? "Código PIX copiado" : "Copiar código PIX"}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-800 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
          >
            {copiado ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
        <span aria-live="polite" className="sr-only">
          {copiado ? "Código PIX copiado para a área de transferência" : ""}
        </span>
      </div>

      <p className="mt-4 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-700">
        Já pagou? Envie o <span className="font-semibold">comprovante</span> no WhatsApp para{" "}
        <span className="font-semibold">{PIX_INSCRICAO.contatoComprovanteFormatado}</span> ou para o
        Gustavo (<span className="font-semibold">{PIX_INSCRICAO.chaveFormatada}</span>) — assim
        confirmamos seu pagamento mais rápido.
      </p>

      <p className="mt-2 rounded-xl border border-gold-400/40 bg-gold-400/10 p-3 text-xs leading-relaxed text-foreground">
        <span className="font-semibold">Atenção:</span> em {PIX_INSCRICAO.prazo} conferimos os
        pagamentos. Quem <span className="font-semibold">não enviar o comprovante</span> ao
        recebedor até lá é <span className="font-semibold">removido do bolão</span> e não participa
        — só fica quem comprovou o pagamento.
      </p>
    </section>
  );
}
