import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { DIAS_SEMANA_ABREV, toDateKey } from "../lib";

interface SeletorSemanaProps {
  weekDays: readonly Date[];
  selectedDate: string | null;
  todayKey: string;
  daysWithGames: ReadonlySet<string>;
  onSelectDay: (dateKey: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

/**
 * Builds an accessible label for a day button, e.g. "Sábado, 13 de junho".
 * Used by screen readers — visible label is the numeric date only.
 */
function ariaLabelDia(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function SeletorSemana({
  weekDays,
  selectedDate,
  todayKey,
  daysWithGames,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
}: SeletorSemanaProps) {
  return (
    /*
     * sticky top-14 = fica colado abaixo da TopBar (h-14 = 3.5rem).
     * -mx-4 + px-4 expande o fundo até as bordas da tela, quebrando o
     * padding do <main> sem desalinhar o conteúdo interno.
     */
    <div className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
      <div className="flex items-center gap-1">
        {/* Semana anterior */}
        <button
          type="button"
          onClick={onPrevWeek}
          aria-label="Semana anterior"
          title="Semana anterior"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Dias da semana */}
        <div
          className="flex flex-1 justify-between [&::-webkit-scrollbar]:hidden"
          role="group"
          aria-label="Selecionar dia"
        >
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const isSelected = selectedDate === key;
            const isToday = key === todayKey;
            const hasGames = daysWithGames.has(key);

            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                aria-label={ariaLabelDia(day)}
                onClick={() => onSelectDay(key)}
                className="flex min-w-[40px] flex-col items-center gap-0.5"
              >
                {/* Abreviação do dia da semana */}
                <span className="text-[10px] text-muted-foreground uppercase">
                  {DIAS_SEMANA_ABREV[day.getDay()]}
                </span>

                {/* Número do dia — pill verde quando selecionado */}
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-medium transition-colors",
                    isSelected
                      ? "bg-brand-800 text-white"
                      : isToday
                        ? "font-bold text-brand-700 ring-1 ring-brand-300"
                        : "text-foreground hover:bg-muted"
                  )}
                  aria-hidden="true"
                >
                  {day.getDate()}
                </span>

                {/* Ponto indicador — visível apenas nos dias com jogos */}
                <span
                  className={cn(
                    "h-1 w-1 rounded-full",
                    hasGames ? "bg-brand-400" : "bg-transparent"
                  )}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>

        {/* Próxima semana */}
        <button
          type="button"
          onClick={onNextWeek}
          aria-label="Próxima semana"
          title="Próxima semana"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
