"use client";

import { Trophy } from "lucide-react";
import { VALOR_INSCRICAO, DIVISAO_PREMIO } from "@/shared/lib/constants";
import { dividirPote } from "../lib/calcular-divisao";
import { useContagemInscritos } from "../api/queries";
import { BlocoPagamentoInscricao } from "./bloco-pagamento-inscricao";

const reais = (valor: number): string =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const PODIO = [
  { pos: "1º", medalha: "🥇", pct: DIVISAO_PREMIO.primeiro, chave: "primeiro" as const },
  { pos: "2º", medalha: "🥈", pct: DIVISAO_PREMIO.segundo, chave: "segundo" as const },
  { pos: "3º", medalha: "🥉", pct: DIVISAO_PREMIO.terceiro, chave: "terceiro" as const },
];

export function PremiacaoContent() {
  const { data: inscritos, isError } = useContagemInscritos();
  const temContagem = typeof inscritos === "number" && !isError;
  const pote = temContagem ? inscritos * VALOR_INSCRICAO : null;
  const divisao = pote !== null ? dividirPote(pote) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/20 text-gold-500"
          aria-hidden="true"
        >
          <Trophy className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground">Premiação</h1>
        <p className="text-sm text-muted-foreground">
          Inscrição de {reais(VALOR_INSCRICAO)} ·{" "}
          <span className="font-semibold">100% vira prêmio</span>
        </p>
      </header>

      {temContagem && pote !== null && (
        <section
          aria-labelledby="pote"
          className="rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-center"
        >
          <h2
            id="pote"
            className="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
          >
            Pote atual
          </h2>
          <p className="mt-1 font-display text-xl font-bold text-brand-800">
            {`${inscritos} inscritos × ${reais(VALOR_INSCRICAO)} = ${reais(pote)}`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cada participante que entrou no bolão soma ao pote.
          </p>
        </section>
      )}

      <BlocoPagamentoInscricao />

      <section aria-labelledby="divisao">
        <h2 id="divisao" className="mb-3 font-display text-base font-bold text-foreground">
          Como é dividido
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {PODIO.map((p) => (
            <div
              key={p.pos}
              className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 text-center shadow-sm"
            >
              <span className="text-2xl" aria-hidden="true">
                {p.medalha}
              </span>
              <span className="text-sm font-semibold text-foreground">{p.pos} lugar</span>
              <span className="font-mono text-lg font-bold text-brand-800">
                {Math.round(p.pct * 100)}%
              </span>
              {divisao && (
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {reais(divisao[p.chave])}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          A <span className="font-semibold">inscrição</span> é paga via PIX até 10/06/2026; a{" "}
          <span className="font-semibold">premiação</span> é paga após a final (19/jul/2026). O
          critério de desempate é o mesmo do ranking. Todo o dinheiro arrecadado é distribuído — a
          organização não retém nada.
        </p>
      </div>
    </div>
  );
}
