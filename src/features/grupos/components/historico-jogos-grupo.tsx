import { cn } from "@/shared/lib/utils";
import { FlagIcon } from "@/shared/ui/flag-icon";
import { derivarStatusBadge, type Partida } from "@/entities/partida";

interface HistoricoJogosGrupoProps {
  grupo: string;
  jogos: Partida[];
}

const fmtDia = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

const fmtHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function rotuloData(iso: string): string {
  const data = new Date(iso);
  return `${fmtDia.format(data)} · ${fmtHora.format(data)}`;
}

/** Encerrados primeiro (mais recentes no topo), depois os agendados por data. */
function ordenarJogos(jogos: Partida[]): Partida[] {
  return [...jogos].sort((a, b) => {
    const aEncerrada = a.status === "encerrada";
    const bEncerrada = b.status === "encerrada";
    if (aEncerrada !== bEncerrada) return aEncerrada ? -1 : 1;
    const tempoA = new Date(a.dataHora).getTime();
    const tempoB = new Date(b.dataHora).getTime();
    return aEncerrada ? tempoB - tempoA : tempoA - tempoB;
  });
}

function ItemHistorico({ jogo }: { jogo: Partida }) {
  const badge = derivarStatusBadge(jogo);
  const temPlacar = jogo.golsMandante !== null && jogo.golsVisitante !== null;
  const placar = temPlacar ? `${jogo.golsMandante} × ${jogo.golsVisitante}` : "×";

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm",
        jogo.status === "ao-vivo" ? "border-destructive/40 bg-destructive/5" : "border-border",
        jogo.status === "encerrada" && "opacity-80"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
          <span className="truncate text-right text-xs font-medium text-foreground">
            {jogo.mandante.nome}
          </span>
          <FlagIcon codigoFifa={jogo.mandante.codigo} nome={jogo.mandante.nome} tamanho="sm" />
        </div>

        <span
          className={cn(
            "shrink-0 px-1 font-mono text-sm font-bold",
            temPlacar ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {placar}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-1">
          <FlagIcon codigoFifa={jogo.visitante.codigo} nome={jogo.visitante.nome} tamanho="sm" />
          <span className="truncate text-xs font-medium text-foreground">
            {jogo.visitante.nome}
          </span>
        </div>
      </div>

      <span className="shrink-0 text-right text-[10px] leading-tight font-medium text-muted-foreground">
        {jogo.status === "encerrada" ? badge.rotulo : rotuloData(jogo.dataHora)}
      </span>
    </li>
  );
}

/** Lista os jogos de um grupo com placar (encerrados) ou data (agendados). */
export function HistoricoJogosGrupo({ grupo, jogos }: HistoricoJogosGrupoProps) {
  if (jogos.length === 0) return null;
  const ordenados = ordenarJogos(jogos);

  return (
    <section aria-label={`Jogos do grupo ${grupo}`} className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Jogos do Grupo {grupo}
      </h3>
      <ul className="space-y-2">
        {ordenados.map((jogo) => (
          <ItemHistorico key={jogo.id} jogo={jogo} />
        ))}
      </ul>
    </section>
  );
}
