"use client";

import type { FaseCopa } from "@/entities/partida";

export type FiltroFaseValue = FaseCopa | "todas";

interface FiltroFaseProps {
  fases: readonly FaseCopa[];
  value: FiltroFaseValue;
  onChange: (value: FiltroFaseValue) => void;
}

const FASE_LABEL: Record<FaseCopa, string> = {
  grupos: "Grupos",
  "trinta-e-dois": "R32",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semis",
  "terceiro-lugar": "3º Lugar",
  final: "Final",
};

/** Ordem canônica das fases da competição. */
const ORDEM_FASES: readonly FaseCopa[] = [
  "grupos",
  "trinta-e-dois",
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
];

/** Chips horizontais de filtro por fase. Só mostra fases que têm partidas no filtro de status atual. */
export function FiltroFase({ fases, value, onChange }: FiltroFaseProps) {
  if (fases.length <= 1) {
    // Com uma única fase disponível, o filtro não agrega valor.
    return null;
  }

  const fasesOrdenadas = ORDEM_FASES.filter((fase) => fases.includes(fase));

  return (
    <div
      className="-mx-4 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden"
      aria-label="Filtrar por fase"
    >
      <div className="flex gap-2 py-1" role="group">
        <button
          type="button"
          onClick={() => onChange("todas")}
          className={`min-h-9 shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            value === "todas"
              ? "bg-brand-800 text-white"
              : "border border-border text-muted-foreground hover:border-brand-200 hover:text-foreground"
          }`}
        >
          Todas
        </button>
        {fasesOrdenadas.map((fase) => {
          const ativo = value === fase;
          return (
            <button
              key={fase}
              type="button"
              onClick={() => onChange(fase)}
              className={`min-h-9 shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                ativo
                  ? "bg-brand-800 text-white"
                  : "border border-border text-muted-foreground hover:border-brand-200 hover:text-foreground"
              }`}
            >
              {FASE_LABEL[fase]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
