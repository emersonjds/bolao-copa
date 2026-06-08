"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { usePartidas } from "@/features/partidas";
import type { FaseCopa } from "@/entities/partida";
import { FiltroStatus, type FiltroStatusValue } from "./filtro-status";
import { FiltroFase, type FiltroFaseValue } from "./filtro-fase";
import { CardAdmin, CardAdminSkeleton } from "./card-admin";

/** Ordem canônica das fases para estabilizar o Set → Array. */
const ORDEM_FASES: readonly FaseCopa[] = [
  "grupos",
  "trinta-e-dois",
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
];

/** Conteúdo da tela admin. Só renderiza quando `useIsAdmin()` confirma acesso. */
export function AdminContent() {
  const { data: partidas, isLoading, isError, refetch } = usePartidas();

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusValue>("pendentes");
  const [filtroFase, setFiltroFase] = useState<FiltroFaseValue>("todas");

  const partidasPorStatus = (partidas ?? []).filter((p) =>
    filtroStatus === "pendentes"
      ? p.status === "agendada" || p.status === "ao-vivo"
      : p.status === "encerrada"
  );

  const fasesDisponiveis = ORDEM_FASES.filter((fase) =>
    partidasPorStatus.some((p) => p.fase === fase)
  );

  // Quando o filtro de fase selecionado não existe na lista atual (ex.: troca de status),
  // deriva "todas" sem mutar estado durante o render.
  const filtroFaseEfetivo: FiltroFaseValue =
    filtroFase === "todas" || fasesDisponiveis.includes(filtroFase as FaseCopa)
      ? filtroFase
      : "todas";

  const partidasFiltradas = partidasPorStatus.filter(
    (p) => filtroFaseEfetivo === "todas" || p.fase === filtroFaseEfetivo
  );

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <header>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">Painel admin</h1>
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
              ADMIN
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Inserção de resultados</p>
        </header>
        <div className="flex gap-2">
          <div className="h-11 w-28 animate-pulse rounded-full bg-muted" aria-hidden="true" />
          <div className="h-11 w-28 animate-pulse rounded-full bg-muted" aria-hidden="true" />
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <CardAdminSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <p className="text-sm text-destructive">
          Não foi possível carregar as partidas. Tente novamente.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader />

      <FiltroStatus
        value={filtroStatus}
        onChange={(v) => {
          setFiltroStatus(v);
          setFiltroFase("todas");
        }}
      />

      <FiltroFase fases={fasesDisponiveis} value={filtroFaseEfetivo} onChange={setFiltroFase} />

      {partidasFiltradas.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"
            aria-hidden="true"
          >
            <ShieldCheck className="h-6 w-6 text-muted-foreground" />
          </span>
          <p className="text-sm text-muted-foreground">
            {filtroStatus === "pendentes"
              ? "Nenhuma partida pendente."
              : "Nenhuma partida encerrada."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {partidasFiltradas.map((p) => (
            <CardAdmin
              key={`${p.id}-${p.status}-${p.golsMandante}-${p.golsVisitante}`}
              partida={p}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PageHeader() {
  return (
    <header>
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-foreground">Painel admin</h1>
        <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
          ADMIN
        </span>
      </div>
      <p className="text-sm text-muted-foreground">Inserção de resultados</p>
    </header>
  );
}
