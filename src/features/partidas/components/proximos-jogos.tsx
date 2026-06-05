"use client";

import { usePartidas } from "../api/queries";
import type { Partida } from "@/entities/partida";

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function CardJogo({ partida }: { partida: Partida }) {
  return (
    <li className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
          Grupo {partida.grupo}
        </span>
        <span className="text-sm font-medium text-foreground">
          {partida.mandante.nome}
          <span className="mx-2 text-muted-foreground">x</span>
          {partida.visitante.nome}
        </span>
      </div>
      <time className="text-xs text-muted-foreground" dateTime={partida.dataHora}>
        {formatadorData.format(new Date(partida.dataHora))}
      </time>
    </li>
  );
}

export function ProximosJogos() {
  const { data: partidas, isLoading, isError } = usePartidas();

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando jogos…</p>;
  }

  if (isError || !partidas) {
    return <p className="text-sm text-destructive">Não foi possível carregar os jogos.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {partidas.map((partida) => (
        <CardJogo key={partida.id} partida={partida} />
      ))}
    </ul>
  );
}
