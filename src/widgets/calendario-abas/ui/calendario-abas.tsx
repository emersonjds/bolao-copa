"use client";

import { useState } from "react";
import { CalendarioContent } from "@/features/calendario";
import { GruposContent } from "@/features/grupos";

type Aba = "agenda" | "grupos";

const ABAS: { id: Aba; label: string }[] = [
  { id: "agenda", label: "Agenda" },
  { id: "grupos", label: "Grupos" },
];

/**
 * Alterna entre a agenda de jogos e a classificação dos grupos dentro de
 * /calendario, sem inflar a navegação principal. O estado é client-only —
 * a página continua Server Component (preserva metadata e static export).
 */
export function CalendarioAbas() {
  const [aba, setAba] = useState<Aba>("agenda");

  return (
    <>
      <div
        role="tablist"
        aria-label="Visualização da Copa"
        className="mb-4 flex gap-1 rounded-full bg-muted p-1"
      >
        {ABAS.map((item) => {
          const ativa = item.id === aba;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={ativa}
              onClick={() => setAba(item.id)}
              className={
                ativa
                  ? "flex-1 rounded-full bg-brand-800 px-4 py-2 text-sm font-semibold text-white"
                  : "flex-1 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {aba === "agenda" ? <CalendarioContent /> : <GruposContent />}
    </>
  );
}
