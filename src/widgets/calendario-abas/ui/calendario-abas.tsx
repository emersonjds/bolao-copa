"use client";

import { useState } from "react";
import Link from "next/link";
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
      <Link
        href="/chaveamento"
        className="mb-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
      >
        <span>Ver chaveamento do mata-mata</span>
        <span aria-hidden="true">→</span>
      </Link>

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
