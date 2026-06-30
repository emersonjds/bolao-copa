"use client";

import { useMemo, useState } from "react";
import { Globe } from "lucide-react";
import { usePartidas } from "@/features/partidas";
import { derivarClassificacao } from "../lib/derivar-classificacao";
import { TabelaGrupo } from "./tabela-grupo";
import { LegendaGrupo } from "./legenda-grupo";
import { HistoricoJogosGrupo } from "./historico-jogos-grupo";

function GruposSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-8 w-16 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function GruposContent() {
  const { data: partidas, isLoading, isError, refetch } = usePartidas();
  const [grupoAtivo, setGrupoAtivo] = useState<string | null>(null);

  const classificacoes = useMemo(() => derivarClassificacao(partidas ?? []), [partidas]);

  const grupoSelecionado =
    classificacoes.find((c) => c.grupo === grupoAtivo) ?? classificacoes[0] ?? null;

  if (isLoading) return <GruposSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar os grupos. Tente novamente.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="h-10 rounded-xl bg-brand-800 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!grupoSelecionado) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Globe className="h-10 w-10 text-brand-200" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">Grupos ainda não disponíveis</p>
        <p className="text-xs text-muted-foreground">
          A tabela aparece assim que os grupos da Copa forem definidos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Selecionar grupo"
        className="-mx-4 overflow-x-auto px-4 [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex gap-2 py-1">
          {classificacoes.map((classificacao) => {
            const ativo = classificacao.grupo === grupoSelecionado.grupo;
            return (
              <button
                key={classificacao.grupo}
                role="tab"
                type="button"
                aria-selected={ativo}
                onClick={() => setGrupoAtivo(classificacao.grupo)}
                className={
                  ativo
                    ? "rounded-full bg-brand-800 px-4 py-1.5 text-sm font-semibold whitespace-nowrap text-white"
                    : "rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground hover:border-brand-200 hover:text-foreground"
                }
              >
                Grupo {classificacao.grupo}
              </button>
            );
          })}
        </div>
      </div>

      {/* key força remount → dispara a animação de entrada ao trocar de grupo */}
      <div key={grupoSelecionado.grupo} className="animate-fade-slide space-y-4">
        <TabelaGrupo classificacao={grupoSelecionado} />

        <LegendaGrupo finalizado={grupoSelecionado.finalizado} />

        <HistoricoJogosGrupo grupo={grupoSelecionado.grupo} jogos={grupoSelecionado.jogos} />
      </div>
    </div>
  );
}
