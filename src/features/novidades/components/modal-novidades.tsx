"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import type { Aviso } from "../model/aviso-atual";

interface ModalNovidadesProps {
  aviso: Aviso;
  onFechar: () => void;
}

export function ModalNovidades({ aviso, onFechar }: ModalNovidadesProps) {
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botaoRef.current?.focus();
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onFechar();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onFechar}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-novidades"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"
            aria-hidden="true"
          >
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 id="titulo-novidades" className="font-display text-lg font-bold text-foreground">
            {aviso.titulo}
          </h2>
        </div>

        <ul className="space-y-3">
          {aviso.itens.map((item) => (
            <li key={item.titulo} className="flex gap-3">
              <span className="text-xl leading-none" aria-hidden="true">
                {item.emoji}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.descricao}</p>
              </div>
            </li>
          ))}
        </ul>

        <button
          ref={botaoRef}
          type="button"
          onClick={onFechar}
          className="mt-5 h-11 w-full rounded-xl bg-brand-800 font-semibold text-white transition-colors hover:bg-brand-900"
        >
          Bora!
        </button>
      </div>
    </div>
  );
}
