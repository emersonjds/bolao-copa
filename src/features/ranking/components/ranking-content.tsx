"use client";

import { RotateCcw, Trophy } from "lucide-react";
import { useRanking } from "../api/queries";
import { DestaqueRodadaCard } from "./destaque-rodada-card";
import { useMeuParticipanteId } from "@/shared/lib/supabase";
import { Podio } from "./podio";
import { ListaRanking } from "./lista-ranking";

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------

function PodioSkeleton() {
  return <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-hidden="true" />;
}

function ListaSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          // index como key é aceitável aqui: lista estática de skeletons, nunca reordena
          key={i}
          className="h-14 animate-pulse rounded-2xl bg-muted"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * Orquestrador da tela de Ranking. Gerencia todos os estados (loading, erro,
 * vazio, dados) e compõe Pódio + MinhaPosiçãoBanner + ListaRanking.
 * Deve ser renderizado dentro de um QueryProvider e AuthProvider.
 */
export function RankingContent() {
  const { data, isLoading, isError, refetch } = useRanking();
  const meuParticipanteId = useMeuParticipanteId();

  // Estado: carregando
  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando ranking">
        <DestaqueRodadaCard />
        <PodioSkeleton />
        <ListaSkeleton />
      </div>
    );
  }

  // Estado: erro de rede ou do servidor
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <p className="text-sm text-destructive">
          Não foi possível carregar o ranking. Tente novamente.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // Estado: sem dados (nenhum resultado apurado ainda)
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 text-gold-600">
          <Trophy className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-medium text-foreground">Nenhum resultado apurado ainda</p>
        <p className="max-w-xs text-xs text-muted-foreground">
          O ranking aparece após o primeiro resultado apurado.
        </p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Dados disponíveis
  // ---------------------------------------------------------------------------

  const top3 = data.slice(0, 3);
  const restante = data.slice(3);

  return (
    <div className="space-y-4">
      {/* Craque da rodada — auto-suficiente, retorna null quando sem dados */}
      <DestaqueRodadaCard />

      {/* Pódio top-3: ordem visual 2º | 1º | 3º */}
      <Podio top3={top3} meuParticipanteId={meuParticipanteId} />

      {/* Lista completa a partir do 4º lugar — a própria linha destaca "Você",
          dispensando um banner separado de posição (decisão de UX). */}
      {restante.length > 0 && (
        <ListaRanking items={restante} meuParticipanteId={meuParticipanteId} />
      )}
    </div>
  );
}
