"use client";

import { Medal } from "lucide-react";
import { AvatarParticipante } from "@/shared/ui/avatar-participante";
import { useDestaqueRodada } from "../api/queries";

interface DestaqueRodadaCardProps {
  /** Rodada específica; omitido = última jornada apurada. */
  rodada?: number;
  className?: string;
}

/**
 * "Craque da Rodada" — o(s) apostador(es) que mais pontuaram na última jornada
 * apurada (o "funcionário do mês" do bolão). Em caso de empate, mostra todos.
 * Auto-suficiente: busca os próprios dados e retorna null quando ainda não há
 * destaque (nenhuma rodada apurada). Usado no Dashboard e no Ranking.
 */
export function DestaqueRodadaCard({ rodada, className }: DestaqueRodadaCardProps) {
  const { data, isLoading } = useDestaqueRodada(rodada);

  if (isLoading) {
    return (
      <div
        className={`h-24 animate-pulse rounded-2xl bg-muted ${className ?? ""}`}
        aria-busy="true"
      />
    );
  }

  if (!data || data.length === 0) return null;

  const numeroRodada = data[0].rodada;
  const varios = data.length > 1;

  return (
    <section
      className={`rounded-2xl border-2 border-gold-400 bg-brand-800 p-4 text-white shadow-sm ${className ?? ""}`}
      aria-label="Destaque da rodada"
    >
      <header className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-400/20 text-gold-400">
          <Medal className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-gold-400 uppercase">
            {varios ? "Craques da rodada" : "Craque da rodada"}
          </p>
          <p className="text-sm font-bold text-white">Rodada {numeroRodada}</p>
        </div>
      </header>

      <ul className="space-y-2">
        {data.map((destaque) => (
          <li key={destaque.participanteId} className="flex items-center gap-3">
            <AvatarParticipante nome={destaque.nome} avatarUrl={destaque.avatarUrl} tamanho={36} />
            <span className="flex-1 truncate text-sm font-semibold text-white">
              {destaque.nome}
            </span>
            <span className="font-mono text-sm font-bold text-gold-400">
              {destaque.pontosRodada} {destaque.pontosRodada === 1 ? "pt" : "pts"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
