import type { Partida } from "@/entities/partida";
import { formatarHeaderDia } from "../lib";
import { ItemJogo } from "./item-jogo";

interface GrupoDiaProps {
  dateKey: string;
  date: Date;
  partidas: readonly Partida[];
  eHoje: boolean;
  mostrarCta: boolean;
}

export function GrupoDia({ dateKey, date, partidas, eHoje, mostrarCta }: GrupoDiaProps) {
  const count = partidas.length;
  const labelJogos = count === 1 ? "1 jogo" : `${count} jogos`;
  const headerId = `header-dia-${dateKey}`;

  return (
    <section aria-labelledby={headerId}>
      {/*
       * Sticky header do dia. O offset top-[calc(3.5rem+72px)] compensa
       * a TopBar (h-14 = 3.5rem) + a altura do SeletorSemana (~72px).
       * Ajuste o valor caso a altura do SeletorSemana mude.
       */}
      <div
        id={headerId}
        className="sticky top-[calc(3.5rem+72px)] z-[5] -mx-4 bg-background/90 px-4 py-1.5 backdrop-blur"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tracking-wide text-foreground uppercase">
            {formatarHeaderDia(date)}
          </span>
          <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
            {labelJogos}
          </span>
          {eHoje && (
            <span className="rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-white">
              Hoje
            </span>
          )}
        </div>
      </div>

      {/* Lista de jogos do dia */}
      <ul className="mt-2 flex flex-col gap-2 pb-4">
        {partidas.map((partida) => (
          <ItemJogo key={partida.id} partida={partida} mostrarCta={mostrarCta} />
        ))}
      </ul>
    </section>
  );
}
