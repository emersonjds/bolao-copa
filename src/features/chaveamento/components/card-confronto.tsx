"use client";

import { FlagIcon } from "@/shared/ui/flag-icon";
import type { ConfrontoBracket, LadoConfronto } from "../lib/derivar-bracket";

interface LadoProps {
  lado: LadoConfronto;
  encerrada: boolean;
}

function Lado({ lado, encerrada }: LadoProps) {
  return (
    <div className="flex items-center justify-between gap-1.5 py-0.5">
      <div className="flex min-w-0 items-center gap-1.5">
        {lado.selecao ? (
          <FlagIcon codigoFifa={lado.selecao.codigo} nome={lado.selecao.nome} tamanho="sm" />
        ) : (
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted ring-1 ring-black/10"
            aria-hidden="true"
          />
        )}
        <span
          className={
            lado.vencedor
              ? "truncate text-xs font-bold text-brand-700"
              : "truncate text-xs text-foreground"
          }
        >
          {lado.placeholder}
        </span>
      </div>
      {encerrada && (
        <span
          className={
            lado.vencedor
              ? "shrink-0 font-mono text-xs font-bold text-brand-700"
              : "shrink-0 font-mono text-xs text-muted-foreground"
          }
          aria-label={`${lado.gols} gols`}
        >
          {lado.gols}
        </span>
      )}
    </div>
  );
}

interface CardConfrontoProps {
  confronto: ConfrontoBracket;
}

export function CardConfronto({ confronto }: CardConfrontoProps) {
  const encerrada = confronto.status === "encerrada";

  return (
    <article className="w-44 rounded-lg border border-border bg-card p-2 shadow-sm">
      <Lado lado={confronto.mandante} encerrada={encerrada} />
      <div className="my-0.5 border-t border-border/50" />
      <Lado lado={confronto.visitante} encerrada={encerrada} />
    </article>
  );
}
