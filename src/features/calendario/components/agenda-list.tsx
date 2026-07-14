import { diasEntre, formatarDiaPorExtenso, type GrupoDiaData } from "../lib";
import { GrupoDia } from "./grupo-dia";

interface AgendaListProps {
  groups: readonly GrupoDiaData[];
  selectedDate: string | null;
  todayKey: string;
  proximoDia: GrupoDiaData | null;
  mostrarCta: boolean;
  onIrParaDia: (grupo: GrupoDiaData) => void;
}

function contagemRegressiva(hoje: Date, proximo: Date): string {
  const dias = diasEntre(hoje, proximo);
  if (dias === 1) return "amanhã";
  return `em ${dias} dias`;
}

function teaserDoDia(grupo: GrupoDiaData): string {
  if (grupo.partidas.length > 1) return `${grupo.partidas.length} jogos`;
  const [jogo] = grupo.partidas;
  return `${jogo.mandante.nome} × ${jogo.visitante.nome}`;
}

function EstadoVazio({
  titulo,
  eHoje,
  proximoDia,
  onIrParaDia,
}: {
  titulo: string;
  eHoje: boolean;
  proximoDia: GrupoDiaData | null;
  onIrParaDia: (grupo: GrupoDiaData) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <span className="text-3xl" aria-hidden="true">
        ⚽
      </span>

      <div className="space-y-1">
        <p className="font-display text-base font-bold text-foreground">{titulo}</p>
        {proximoDia && (
          <p className="text-sm text-muted-foreground">
            {eHoje && `Bola rola ${contagemRegressiva(new Date(), proximoDia.date)} · `}
            {formatarDiaPorExtenso(proximoDia.date)}
          </p>
        )}
      </div>

      {proximoDia && (
        <>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800">
            {teaserDoDia(proximoDia)}
          </span>
          <button
            type="button"
            onClick={() => onIrParaDia(proximoDia)}
            className="mt-1 flex h-11 min-w-[160px] items-center justify-center rounded-full bg-brand-700 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
          >
            Ver esse dia
          </button>
        </>
      )}
    </div>
  );
}

export function AgendaList({
  groups,
  selectedDate,
  todayKey,
  proximoDia,
  mostrarCta,
  onIrParaDia,
}: AgendaListProps) {
  const visibleGroups = selectedDate ? groups.filter((g) => g.dateKey === selectedDate) : groups;

  if (visibleGroups.length === 0) {
    if (groups.length === 0) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-center text-sm text-muted-foreground">
            Nenhum jogo agendado no momento.
          </p>
        </div>
      );
    }

    const eHoje = selectedDate === todayKey;
    return (
      <EstadoVazio
        titulo={eHoje ? "Sem jogos hoje" : "Nenhum jogo neste dia"}
        eHoje={eHoje}
        proximoDia={proximoDia}
        onIrParaDia={onIrParaDia}
      />
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
