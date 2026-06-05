"use client";

import Link from "next/link";
import { usePartidas } from "../api/queries";
import type { Partida, StatusPartida } from "@/entities/partida";

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<StatusPartida, string> = {
  agendada: "Agendado",
  "ao-vivo": "Ao vivo",
  encerrada: "Encerrado",
};

const STATUS_STYLE: Record<StatusPartida, string> = {
  agendada: "bg-muted text-muted-foreground",
  "ao-vivo": "bg-destructive/10 text-destructive",
  encerrada: "bg-brand-100 text-brand-700",
};

function StatusPill({ status }: { status: StatusPartida }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${STATUS_STYLE[status]}`}
    >
      {status === "ao-vivo" && (
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive"
          aria-hidden="true"
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

function Selecao({ codigo, nome }: { codigo: string; nome: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 font-mono text-xs font-bold text-brand-800 ring-1 ring-brand-100">
        {codigo}
      </span>
      <span className="text-center text-xs font-medium text-foreground">{nome}</span>
    </div>
  );
}

function CardJogo({ partida }: { partida: Partida }) {
  const temPlacar = partida.golsMandante !== null && partida.golsVisitante !== null;
  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          {partida.grupo ? `Grupo ${partida.grupo}` : partida.fase}
        </span>
        <StatusPill status={partida.status} />
      </div>

      <div className="flex items-center gap-2">
        <Selecao codigo={partida.mandante.codigo} nome={partida.mandante.nome} />
        <div className="flex flex-col items-center px-1">
          <span className="font-mono text-lg font-bold text-foreground">
            {temPlacar ? `${partida.golsMandante} : ${partida.golsVisitante}` : "x"}
          </span>
          <time className="mt-0.5 text-[11px] text-muted-foreground" dateTime={partida.dataHora}>
            {formatadorData.format(new Date(partida.dataHora))}
          </time>
        </div>
        <Selecao codigo={partida.visitante.codigo} nome={partida.visitante.nome} />
      </div>

      {partida.status === "agendada" && (
        <Link
          href="/palpites"
          className="mt-4 flex h-10 w-full items-center justify-center rounded-xl bg-brand-800 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
        >
          Fazer palpite
        </Link>
      )}
    </li>
  );
}

export function ProximosJogos() {
  const { data: partidas, isLoading, isError } = usePartidas();

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <li key={index} className="h-36 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </ul>
    );
  }

  if (isError || !partidas) {
    return <p className="text-sm text-destructive">Não foi possível carregar os jogos.</p>;
  }

  if (partidas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum jogo por aqui ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {partidas.map((partida) => (
        <CardJogo key={partida.id} partida={partida} />
      ))}
    </ul>
  );
}
