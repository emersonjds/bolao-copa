"use client";

import { useState } from "react";
import { PremiacaoContent } from "@/features/premiacao";
import { RegrasContent } from "@/features/regras";

type Aba = "premiacao" | "regras";

const ABAS: { id: Aba; label: string }[] = [
  { id: "premiacao", label: "Premiação" },
  { id: "regras", label: "Regras" },
];

/**
 * Abas [Premiação | Regras] dentro de /premiacao. As regras passaram a morar
 * aqui (conteúdo conceitualmente próximo de prêmios/pontuação) para liberar o
 * slot "Copa" na navegação principal. A rota /regras segue existindo.
 */
export function PremiacaoAbas() {
  const [aba, setAba] = useState<Aba>("premiacao");

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Premiação e regras"
        className="flex gap-1 rounded-full bg-muted p-1"
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

      {aba === "premiacao" ? <PremiacaoContent /> : <RegrasContent />}
    </div>
  );
}
