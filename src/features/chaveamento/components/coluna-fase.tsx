"use client";

import type { ConfrontoBracket, RodadaBracket } from "../lib/derivar-bracket";
import { CardConfronto } from "./card-confronto";

interface ColunaFaseProps {
  rodada: RodadaBracket;
}

export function ColunaFase({ rodada }: ColunaFaseProps) {
  const pares: ConfrontoBracket[][] = [];
  for (let i = 0; i < rodada.confrontos.length; i += 2) {
    pares.push(rodada.confrontos.slice(i, i + 2));
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="px-1 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {rodada.titulo}
      </h3>
      <div className="flex flex-col gap-4">
        {pares.map((par, idx) => (
          // ponytail: top-1/4 bottom-1/4 aproxima o centro de cada card num par de altura igual; pixel refina
          <div key={idx} className="relative flex flex-col gap-2 pr-4">
            {par.map((c) => (
              <CardConfronto key={c.numero} confronto={c} />
            ))}
            {par.length === 2 && (
              <div
                className="absolute bottom-1/4 right-0 top-1/4 w-4 rounded-r-sm border-b-2 border-r-2 border-t-2 border-border/50"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
