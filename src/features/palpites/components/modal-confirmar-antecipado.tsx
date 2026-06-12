"use client";

import { useEffect, useRef } from "react";
import { CalendarClock } from "lucide-react";

interface ModalConfirmarAntecipadoProps {
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Mostrado na primeira vez que a pessoa salva um palpite de jogo futuro. Deixa
 * claro que o antecipado vale, mas continua ajustável até o apito.
 */
export function ModalConfirmarAntecipado({
  onConfirmar,
  onCancelar,
}: ModalConfirmarAntecipadoProps) {
  const confirmarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmarRef.current?.focus();
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onCancelar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop como botão real: clicar fora fecha, com acessibilidade correta. */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onCancelar}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-antecipado"
        aria-describedby="texto-antecipado"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-3 flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700"
            aria-hidden="true"
          >
            <CalendarClock className="h-5 w-5" />
          </span>
          <h2 id="titulo-antecipado" className="font-display text-base font-bold text-foreground">
            Palpite antecipado
          </h2>
        </div>

        <p id="texto-antecipado" className="text-sm leading-relaxed text-muted-foreground">
          Esses serão os palpites usados quando o jogo começar — a não ser que você ajuste no dia.
          Você pode mudar quantas vezes quiser até o apito inicial.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            ref={confirmarRef}
            type="button"
            onClick={onConfirmar}
            className="h-11 flex-1 rounded-xl bg-brand-800 font-semibold text-white transition-colors hover:bg-brand-900"
          >
            Entendi, salvar
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="h-11 flex-1 rounded-xl border border-border font-medium text-foreground transition-colors hover:bg-muted"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
