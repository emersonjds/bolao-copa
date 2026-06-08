"use client";

import { Trophy, Shirt } from "lucide-react";
import { VALOR_INSCRICAO, DIVISAO_PREMIO } from "@/shared/lib/constants";
import { dividirPote } from "../lib/calcular-divisao";
import { useContagemInscritos } from "../api/queries";

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
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/20 text-gold-500" aria-hidden="true">
          <Trophy className="h-7 w-7" />
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground">Premiação</h1>
        <p className="text-sm text-muted-foreground">
          Inscrição de {reais(VALOR_INSCRICAO)} · <span className="font-semibold">100% vira prêmio</span>
        </p>
      </header>

      {temContagem && pote !== null && (
        <section aria-labelledby="pote" className="rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-center">
          <h2 id="pote" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Pote atual</h2>
          <p className="mt-1 font-display text-xl font-bold text-brand-800">
            {`${inscritos} inscritos × ${reais(VALOR_INSCRICAO)} = ${reais(pote)}`}
          </p>
        </section>
      )}

      <section aria-labelledby="divisao">
        <h2 id="divisao" className="mb-3 font-display text-base font-bold text-foreground">Como é dividido</h2>
        <div className="grid grid-cols-3 gap-2">
          {PODIO.map((p) => (
            <div key={p.pos} className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 text-center shadow-sm">
              <span className="text-2xl" aria-hidden="true">{p.medalha}</span>
              <span className="text-sm font-semibold text-foreground">{p.pos} lugar</span>
              <span className="font-mono text-lg font-bold text-brand-800">{Math.round(p.pct * 100)}%</span>
              {divisao && (
                <span className="font-mono text-xs font-semibold text-muted-foreground">{reais(divisao[p.chave])}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="campeao" className="rounded-2xl border border-brand-200 bg-brand-50 p-4">
        <h2 id="campeao" className="flex items-center gap-2 text-sm font-semibold text-brand-800">
          <Shirt className="h-4 w-4 shrink-0" aria-hidden="true" />
          O campeão escolhe
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-brand-700">
          O 1º lugar pode levar uma <span className="font-semibold">camisa oficial</span> da seleção que
          quiser <span className="font-semibold">mais a diferença em dinheiro</span>, ou receber todo o
          prêmio em dinheiro. 2º e 3º recebem em dinheiro.
        </p>
      </section>

      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold">Pagamento após a final</span> (19/jul/2026). O critério de
          desempate é o mesmo do ranking. Todo o dinheiro arrecadado é distribuído — a organização não
          retém nada.
        </p>
      </div>
    </div>
  );
}
