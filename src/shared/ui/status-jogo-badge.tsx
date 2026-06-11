import { cn } from "@/shared/lib/utils";
import { derivarStatusBadge, type Partida, type VarianteStatusBadge } from "@/entities/partida";

const ESTILO: Record<VarianteStatusBadge, string> = {
  "ao-vivo": "bg-destructive/10 text-destructive",
  "em-breve": "bg-gold-500/15 text-gold-600",
  agendado: "bg-muted text-muted-foreground",
  encerrado: "bg-brand-100 text-brand-700",
};

interface StatusJogoBadgeProps {
  partida: Partida;
  className?: string;
}

/** Tag única de status do jogo, consistente em todos os cards (sempre CAIXA ALTA). */
export function StatusJogoBadge({ partida, className }: StatusJogoBadgeProps) {
  const { variante, rotulo, comPulso } = derivarStatusBadge(partida);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        ESTILO[variante],
        className
      )}
    >
      {comPulso && (
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive"
          aria-hidden="true"
        />
      )}
      {rotulo}
    </span>
  );
}
