import Link from "next/link";
import { Target } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { FlagIcon } from "@/shared/ui/flag-icon";
import type { Partida } from "@/entities/partida";
import { getFaseBadge, formatarHorario } from "../lib";

interface ItemJogoProps {
  partida: Partida;
  mostrarCta: boolean;
}

export function ItemJogo({ partida, mostrarCta }: ItemJogoProps) {
  const estaEncerrada = partida.status === "encerrada";
  const estaAoVivo = partida.status === "ao-vivo";
  const estaAgendada = partida.status === "agendada";
  const temPlacar = partida.golsMandante !== null && partida.golsVisitante !== null;

  const horario = formatarHorario(partida.dataHora);
  const faseBadge = getFaseBadge(partida);

  const placarOuX = temPlacar ? `${partida.golsMandante} × ${partida.golsVisitante}` : "×";

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm",
        estaAoVivo ? "border-destructive/40 bg-destructive/5" : "border-border",
        estaEncerrada && "opacity-70"
      )}
    >
      {/* Horário */}
      <time
        dateTime={partida.dataHora}
        className={cn(
          "w-12 shrink-0 font-mono text-sm font-bold",
          estaAoVivo ? "animate-pulse text-destructive" : "text-muted-foreground"
        )}
      >
        {estaAoVivo ? "Ao vivo" : horario}
      </time>

      {/* Confronto: mandante × visitante */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {/* Mandante */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <span className="truncate text-right text-xs font-medium text-foreground">
            {partida.mandante.nome}
          </span>
          <FlagIcon
            codigoFifa={partida.mandante.codigo}
            nome={partida.mandante.nome}
            tamanho="sm"
          />
        </div>

        {/* Placar ou separador */}
        <span className="shrink-0 px-1 font-mono text-sm font-bold text-muted-foreground">
          {placarOuX}
        </span>

        {/* Visitante */}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <FlagIcon
            codigoFifa={partida.visitante.codigo}
            nome={partida.visitante.nome}
            tamanho="sm"
          />
          <span className="truncate text-xs font-medium text-foreground">
            {partida.visitante.nome}
          </span>
        </div>
      </div>

      {/* Badge de fase */}
      <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
        {faseBadge}
      </span>

      {/* CTA — somente em jogos agendados para usuários autenticados */}
      {mostrarCta && estaAgendada ? (
        <Link
          href={`/palpites#${partida.id}`}
          aria-label={`Dar palpite para ${partida.mandante.nome} vs ${partida.visitante.nome}`}
          title={`Dar palpite para ${partida.mandante.nome} vs ${partida.visitante.nome}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 transition-colors hover:bg-brand-100"
        >
          <Target className="h-4 w-4 text-brand-700" aria-hidden="true" />
        </Link>
      ) : null}
    </li>
  );
}
