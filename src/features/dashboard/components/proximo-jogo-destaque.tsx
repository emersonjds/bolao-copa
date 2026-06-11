"use client";

import Link from "next/link";
import { usePartidas } from "@/features/partidas";
import { encontrarProximoJogo } from "@/features/partidas/lib/proximo-jogo";
import { FlagIcon } from "@/shared/ui/flag-icon";
import { StatusJogoBadge } from "@/shared/ui/status-jogo-badge";
import type { FaseCopa } from "@/entities/partida";

const FASE_LABEL: Record<FaseCopa, string> = {
  grupos: "Fase de Grupos",
  "trinta-e-dois": "Rodada de 32",
  oitavas: "Oitavas de Final",
  quartas: "Quartas de Final",
  semifinal: "Semifinal",
  "terceiro-lugar": "Terceiro Lugar",
  final: "Final",
};

const horarioFmt = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Retorna null quando não há jogo iminente nas próximas 24h ou enquanto os dados carregam. */
export function ProximoJogoDestaque() {
  const { data: partidas, isLoading } = usePartidas();

  if (isLoading) {
    return (
      <div
        className="h-40 animate-pulse rounded-2xl bg-muted"
        aria-busy="true"
        aria-hidden="true"
      />
    );
  }

  if (!partidas) return null;

  const jogo = encontrarProximoJogo(partidas);
  if (!jogo) return null;

  const faseLegenda = jogo.grupo ? `Grupo ${jogo.grupo}` : FASE_LABEL[jogo.fase];
  const horario = horarioFmt.format(new Date(jogo.dataHora));

  return (
    <section
      aria-label={`Próximo jogo: ${jogo.mandante.nome} contra ${jogo.visitante.nome}`}
      className="rounded-2xl border-2 border-gold-400 bg-card p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          {faseLegenda}
        </span>
        <StatusJogoBadge partida={jogo} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <FlagIcon codigoFifa={jogo.mandante.codigo} nome={jogo.mandante.nome} tamanho="lg" />
          <span className="max-w-[80px] truncate text-center text-sm font-semibold text-foreground">
            {jogo.mandante.nome}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="font-mono text-base font-medium text-muted-foreground">vs</span>
          <time
            dateTime={jogo.dataHora}
            className="rounded-full bg-sky-700 px-2 py-0.5 text-[11px] font-medium text-white"
          >
            {horario}
          </time>
        </div>

        <div className="flex flex-1 flex-col items-center gap-1.5">
          <FlagIcon codigoFifa={jogo.visitante.codigo} nome={jogo.visitante.nome} tamanho="lg" />
          <span className="max-w-[80px] truncate text-center text-sm font-semibold text-foreground">
            {jogo.visitante.nome}
          </span>
        </div>
      </div>

      <Link
        href="/palpites"
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-brand-800 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
      >
        Fazer palpite
      </Link>
    </section>
  );
}
