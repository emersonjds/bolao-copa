"use client";

import { FlagIcon } from "@/shared/ui/flag-icon";
import type { ItemHistorico } from "../lib/derivar-historico";

const FASE_LABEL: Record<string, string> = {
  grupos: "Grupos",
  "trinta-e-dois": "R32",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semis",
  "terceiro-lugar": "3º Lugar",
  final: "Final",
};

const formatadorData = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" });
const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface CardHistoricoProps {
  item: ItemHistorico;
}

export function CardHistorico({ item }: CardHistoricoProps) {
  const { partida, palpite, pontos } = item;

  const badgeGrupo = partida.grupo
    ? `Grupo ${partida.grupo}`
    : (FASE_LABEL[partida.fase] ?? partida.fase);

  const dataFormatada = formatadorData.format(new Date(partida.dataHora)).replace(" de ", " ");
  const horaFormatada = formatadorHora.format(new Date(partida.dataHora)).replace(":", "h");

  const temResultado = partida.golsMandante !== null && partida.golsVisitante !== null;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          {badgeGrupo}
        </span>
        <span className="rounded-full bg-sky-700 px-2 py-0.5 text-[11px] font-medium text-white">
          {dataFormatada} · {horaFormatada}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <FlagIcon
            codigoFifa={partida.mandante.codigo}
            nome={partida.mandante.nome}
            tamanho="md"
          />
          <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
            {partida.mandante.nome}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Seu palpite
          </span>
          {palpite ? (
            <span className="font-mono text-xl font-bold text-foreground">
              {palpite.golsMandante} <span className="text-muted-foreground">×</span>{" "}
              {palpite.golsVisitante}
            </span>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground italic">Sem palpite</span>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center gap-1.5">
          <FlagIcon
            codigoFifa={partida.visitante.codigo}
            nome={partida.visitante.nome}
            tamanho="md"
          />
          <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
            {partida.visitante.nome}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-xs text-muted-foreground">
          {temResultado
            ? `Resultado oficial: ${partida.golsMandante} × ${partida.golsVisitante}`
            : "A apurar"}
        </span>
        {pontos !== null && (
          <span className="rounded-full bg-brand-800 px-2.5 py-0.5 font-mono text-sm font-bold text-gold-400">
            {pontos} {pontos === 1 ? "pt" : "pts"}
          </span>
        )}
      </div>
    </article>
  );
}
