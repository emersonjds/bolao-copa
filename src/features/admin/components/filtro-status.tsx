"use client";

export type FiltroStatusValue = "pendentes" | "encerradas";

interface FiltroStatusProps {
  value: FiltroStatusValue;
  onChange: (value: FiltroStatusValue) => void;
}

const OPCOES: Array<{ value: FiltroStatusValue; label: string }> = [
  { value: "pendentes", label: "Pendentes" },
  { value: "encerradas", label: "Encerradas" },
];

/** Tabs de filtro: Pendentes (agendada + ao-vivo) | Encerradas. */
export function FiltroStatus({ value, onChange }: FiltroStatusProps) {
  return (
    <div role="tablist" aria-label="Filtrar por status" className="flex gap-2">
      {OPCOES.map((opcao) => {
        const ativo = opcao.value === value;
        return (
          <button
            key={opcao.value}
            role="tab"
            aria-selected={ativo}
            type="button"
            onClick={() => onChange(opcao.value)}
            className={`min-h-11 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              ativo
                ? "bg-brand-800 text-white"
                : "border border-border text-muted-foreground hover:border-brand-200 hover:text-foreground"
            }`}
          >
            {opcao.label}
          </button>
        );
      })}
    </div>
  );
}
