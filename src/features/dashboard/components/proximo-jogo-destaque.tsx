"use client";

import Link from "next/link";
import { usePartidas } from "@/features/partidas";
import { FlagIcon } from "@/shared/ui/flag-icon";
import type { FaseCopa, Partida } from "@/entities/partida";

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

/** Retorna o primeiro jogo agendado dentro das próximas 24h, ou null. */
function encontrarProximoJogo(partidas: readonly Partida[]): Partida | null {
  const agora = Date.now();
  const limite24h = agora + 24 * 60 * 60 * 1000;

  const candidatos = partidas
    .filter((p) => {
      if (p.status !== "agendada") return false;
      const t = new Date(p.dataHora).getTime();
      return t >= agora && t <= limite24h;
    })
    .slice()
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime());

  return candidatos[0] ?? null;
}

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
        <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[11px] font-semibold text-gold-600">
          Em breve
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <FlagIcon codigoFifa={jogo.mandante.codigo} nome={jogo.mandante.nome} tamanho="lg" />
          <span className="max-w-[80px] truncate text-center text-sm font-semibold text-foreground">
            {jogo.mandante.nome}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="font-mono text-base font-bold text-muted-foreground">vs</span>
          <time dateTime={jogo.dataHora} className="text-[11px] text-muted-foreground">
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
        Dar palpite
      </Link>
    </section>
  );
}
