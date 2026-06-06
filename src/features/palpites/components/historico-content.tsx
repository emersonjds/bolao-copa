"use client";

import { History, Trophy } from "lucide-react";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import { derivarHistorico, type ItemHistorico } from "../lib/derivar-historico";
import { CardHistorico } from "./card-historico";

interface HistoricoContentProps {
  partidas: Partida[];
  meusPalpites: Palpite[];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** "Qui, 11 jun" a partir da data UTC do jogo (noon UTC evita desvio de fuso). */
function formatarData(dataStr: string): string {
  const data = new Date(`${dataStr}T12:00:00Z`);
  const diaSemana = capitalize(
    data.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "").trim()
  );
  const dia = data.toLocaleDateString("pt-BR", { day: "numeric", timeZone: "UTC" });
  const mes = data
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .replace(".", "");
  return `${diaSemana}, ${dia} ${mes}`;
}

/**
 * Aba "Histórico": jogos já travados com o meu palpite, o resultado e os pontos.
 * Tudo derivado no cliente (sem query nova). Resolve "fez ou não fez" mostrando
 * inclusive os jogos em que não houve palpite.
 */
export function HistoricoContent({ partidas, meusPalpites }: HistoricoContentProps) {
  const { itens, totalPontos, jogosApurados } = derivarHistorico(partidas, meusPalpites);

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700"
          aria-hidden="true"
        >
          <History className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted-foreground">
          Nenhum jogo encerrado ainda. Seus palpites travados aparecem aqui.
        </p>
      </div>
    );
  }

  // Agrupa por data UTC, mais recente primeiro (itens já vêm ordenados desc).
  const grupos = new Map<string, ItemHistorico[]>();
  for (const item of itens) {
    const dataStr = item.partida.dataHora.slice(0, 10);
    const grupo = grupos.get(dataStr) ?? [];
    grupo.push(item);
    grupos.set(dataStr, grupo);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 text-gold-400"
          aria-hidden="true"
        >
          <Trophy className="h-5 w-5" />
        </span>
        <div>
          <p className="font-mono text-lg font-bold text-brand-900">
            {totalPontos} {totalPontos === 1 ? "ponto" : "pontos"}
          </p>
          <p className="text-xs text-brand-700">
            em {jogosApurados} {jogosApurados === 1 ? "jogo apurado" : "jogos apurados"}
          </p>
        </div>
      </div>

      {[...grupos.entries()].map(([dataStr, itensDoDia]) => (
        <section key={dataStr} aria-labelledby={`historico-data-${dataStr}`}>
          <div
            id={`historico-data-${dataStr}`}
            className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur"
          >
            <span className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
              {formatarData(dataStr)}
            </span>
          </div>
          <div className="mt-2 space-y-3 pb-2">
            {itensDoDia.map((item) => (
              <CardHistorico key={item.partida.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
