"use client";

import { Loader2 } from "lucide-react";

interface BotaoSalvarProps {
  hasPendingChanges: boolean;
  isSaving: boolean;
  onSalvar: () => void;
}

/**
 * Botão de salvar fixo no rodapé. Visível apenas quando há palpites pendentes
 * ou enquanto o salvamento está em andamento.
 */
export function BotaoSalvar({ hasPendingChanges, isSaving, onSalvar }: BotaoSalvarProps) {
  if (!hasPendingChanges && !isSaving) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-10 bg-gradient-to-t from-background via-background/95 to-transparent px-4 pt-4 pb-2">
      <button
        type="button"
        onClick={onSalvar}
        disabled={isSaving}
        aria-busy={isSaving}
        className="mx-auto flex h-12 w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-brand-800 font-semibold text-white shadow-lg transition-colors hover:bg-brand-900 disabled:opacity-70"
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Salvando...
          </>
        ) : (
          "Salvar palpites"
        )}
      </button>
    </div>
  );
}
