import type { GrupoDiaData } from "../lib";
import { GrupoDia } from "./grupo-dia";

interface AgendaListProps {
  groups: readonly GrupoDiaData[];
  selectedDate: string | null;
  todayKey: string;
  mostrarCta: boolean;
}

export function AgendaList({ groups, selectedDate, todayKey, mostrarCta }: AgendaListProps) {
  const visibleGroups = selectedDate ? groups.filter((g) => g.dateKey === selectedDate) : groups;

  if (visibleGroups.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-center text-sm text-muted-foreground">
          {selectedDate ? "Nenhum jogo neste dia." : "Nenhum jogo agendado no momento."}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-1">
      {visibleGroups.map((group) => (
        <GrupoDia
          key={group.dateKey}
          dateKey={group.dateKey}
          date={group.date}
          partidas={group.partidas}
          eHoje={group.dateKey === todayKey}
          mostrarCta={mostrarCta}
        />
      ))}
    </div>
  );
}
