"use client";

import type { FaseCopa } from "@/entities/partida";

const FASE_LABEL: Record<FaseCopa, string> = {
  grupos: "Fase de Grupos",
  "trinta-e-dois": "Trinta e Dois",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semis",
  "terceiro-lugar": "3º Lugar",
  final: "Final",
};

interface FiltroFaseProps {
  fases: FaseCopa[];
  faseSelecionada: FaseCopa;
  onSelect: (fase: FaseCopa) => void;
}

export function FiltroFase({ fases, faseSelecionada, onSelect }: FiltroFaseProps) {
  return (
    <div
      className="-mx-4 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Filtrar por fase"
    >
      <div className="flex gap-2 py-1">
        {fases.map((fase) => {
          const ativa = fase === faseSelecionada;
          return (
            <button
              key={fase}
              role="tab"
              type="button"
              aria-selected={ativa}
              onClick={() => onSelect(fase)}
              className={
                ativa
                  ? "rounded-full bg-brand-800 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white"
                  : "rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:border-brand-200 hover:text-foreground"
              }
            >
              {FASE_LABEL[fase]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
