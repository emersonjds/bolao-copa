"use client";

export type VistaPalpites = "palpitar" | "historico";

const TABS: { id: VistaPalpites; label: string }[] = [
  { id: "palpitar", label: "Palpitar" },
  { id: "historico", label: "Histórico" },
];

interface SeletorVistaProps {
  vista: VistaPalpites;
  onSelect: (vista: VistaPalpites) => void;
}

/** Alterna entre palpitar (jogos abertos) e o histórico (jogos travados). */
export function SeletorVista({ vista, onSelect }: SeletorVistaProps) {
  return (
    <div
      role="tablist"
      aria-label="Modo de visualização"
      className="flex gap-1 rounded-full bg-muted p-1"
    >
      {TABS.map((tab) => {
        const ativa = tab.id === vista;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={ativa}
            onClick={() => onSelect(tab.id)}
            className={
              ativa
                ? "flex-1 rounded-full bg-brand-800 px-4 py-2 text-sm font-semibold text-white"
                : "flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
