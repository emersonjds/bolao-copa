interface LegendaGrupoProps {
  finalizado: boolean;
}

// Quando o grupo encerra, o status deixa de ser provisório: a legenda troca de
// "Avança / Repescagem (prov.)" para "Classificado / Repescagem".
export function LegendaGrupo({ finalizado }: LegendaGrupoProps) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />
        {finalizado ? "Classificado" : "Avança"}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
        {finalizado ? "Repescagem" : "Repescagem (prov.)"}
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
        Eliminado
      </span>
    </p>
  );
}
