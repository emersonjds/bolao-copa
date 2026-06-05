"use client";

import { AvatarParticipante } from "@/shared/ui/avatar-participante";
import type { ItemRanking } from "@/entities/ranking";

interface MinhaPosicaoBannerProps {
  item: ItemRanking;
  /** Posição 1-based do usuário no ranking (sempre ≥ 4 quando este banner é exibido). */
  posicao: number;
}

/**
 * Banner fixo que destaca a posição do usuário logado no ranking
 * quando ele está fora do top-3. Exibido entre o pódio e a lista completa.
 */
export function MinhaPosicaoBanner({ item, posicao }: MinhaPosicaoBannerProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border-2 border-brand-300 bg-brand-50 p-3"
      aria-label={`Sua posição no ranking: ${posicao}º lugar`}
      role="region"
    >
      <span
        className="w-8 shrink-0 text-center font-mono text-2xl font-bold text-brand-800"
        aria-hidden="true"
      >
        {posicao}º
      </span>

      <AvatarParticipante
        nome={item.nome}
        avatarUrl={item.avatarUrl}
        tamanho={40}
        className="shrink-0 ring-2 ring-brand-300"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-semibold text-brand-800">Você</p>
        <p className="font-mono text-xs text-brand-600">
          {item.pontosTotais} {item.pontosTotais === 1 ? "ponto" : "pontos"} · {item.jogosPontuados}{" "}
          {item.jogosPontuados === 1 ? "jogo pontuado" : "jogos pontuados"}
        </p>
      </div>

      <span className="shrink-0 rounded-full bg-brand-800 px-2 py-0.5 text-[10px] font-semibold text-white">
        Sua posição
      </span>
    </div>
  );
}
