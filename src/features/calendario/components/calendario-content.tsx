"use client";

import { useState, useMemo } from "react";
import { usePartidas } from "@/features/partidas";
import { useAuth } from "@/features/auth";
import { toDateKey, groupByDay, getWeekStart, type GrupoDiaData } from "../lib";
import { SeletorSemana } from "./seletor-semana";
import { AgendaList } from "./agenda-list";

function SeletorSemanaSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
    >
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="flex flex-1 justify-between">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <div className="h-3 w-5 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="h-1 w-1 rounded-full bg-transparent" />
            </div>
          ))}
        </div>
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

function AgendaListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Carregando jogos" className="mt-3 flex flex-col gap-2">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} aria-hidden="true" className="h-14 animate-pulse rounded-xl bg-muted" />
      ))}
    </ul>
  );
}

export function CalendarioContent() {
  const { data: partidas, isLoading, isError, refetch } = usePartidas();
  const { user } = useAuth();

  // today is captured once at mount — never changes within a session.
  const [today] = useState<Date>(() => new Date());
  const todayKey = toDateKey(today);

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 7-day window for the week selector, starting on Sunday.
  const weekDays = useMemo<readonly Date[]>(() => {
    const baseStart = getWeekStart(today);
    const displayStart = new Date(baseStart);
    displayStart.setDate(baseStart.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(displayStart);
      d.setDate(displayStart.getDate() + i);
      return d;
    });
  }, [today, weekOffset]);

  const allGroups = useMemo<GrupoDiaData[]>(() => {
    if (!partidas) return [];
    return groupByDay(partidas);
  }, [partidas]);

  const daysWithGames = useMemo<ReadonlySet<string>>(() => {
    return new Set(allGroups.map((g) => g.dateKey));
  }, [allGroups]);

  // Toggle: clicking the active day deselects it (shows all games again).
  const handleSelectDay = (dateKey: string) => {
    setSelectedDate((prev) => (prev === dateKey ? null : dateKey));
  };

  const handlePrevWeek = () => {
    setWeekOffset((prev) => prev - 1);
    setSelectedDate(null);
  };

  const handleNextWeek = () => {
    setWeekOffset((prev) => prev + 1);
    setSelectedDate(null);
  };

  if (isLoading) {
    return (
      <>
        <SeletorSemanaSkeleton />
        <AgendaListSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar a agenda. Tente novamente.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="h-10 rounded-xl bg-brand-800 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <SeletorSemana
        weekDays={weekDays}
        selectedDate={selectedDate}
        todayKey={todayKey}
        daysWithGames={daysWithGames}
        onSelectDay={handleSelectDay}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
      />
      <AgendaList
        groups={allGroups}
        selectedDate={selectedDate}
        todayKey={todayKey}
        mostrarCta={!!user}
      />
    </>
  );
}
