"use client";

import { AvatarParticipante } from "@/shared/ui/avatar-participante";
import type { ItemRanking } from "@/entities/ranking";

interface PodioProps {
  top3: ItemRanking[];
  meuParticipanteId: string | null;
}

interface PodioItemProps {
  item: ItemRanking;
  posicao: 1 | 2 | 3;
  ehMeuPerfil: boolean;
}

const AVATAR_TAMANHO: Record<1 | 2 | 3, number> = { 1: 64, 2: 48, 3: 48 };

const AVATAR_RING: Record<1 | 2 | 3, string> = {
  1: "ring-[3px] ring-gold-400",
  2: "ring-2 ring-white/40",
  3: "ring-2 ring-white/40",
};

const BADGE_CLASSES: Record<1 | 2 | 3, string> = {
  1: "bg-gold-400 text-brand-950",
  2: "bg-white/20 text-white/80",
  3: "bg-white/20 text-white/80",
};

const PONTOS_CLASSES: Record<1 | 2 | 3, string> = {
  1: "font-mono text-base font-bold text-gold-300",
  2: "font-mono text-sm text-white/80",
  3: "font-mono text-sm text-white/80",
};

const NOME_CLASSES: Record<1 | 2 | 3, string> = {
  1: "text-sm font-semibold text-white",
  2: "text-xs font-semibold text-white/90",
  3: "text-xs font-semibold text-white/90",
};

const COLUNA_HEIGHT: Record<1 | 2 | 3, string> = { 1: "h-12", 2: "h-8", 3: "h-4" };

function PodioItem({ item, posicao, ehMeuPerfil }: PodioItemProps) {
  const primeiroNome = item.nome.split(" ").at(0) ?? item.nome;
  const nomeExibido = ehMeuPerfil ? "Você" : primeiroNome;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <AvatarParticipante
        nome={item.nome}
        avatarUrl={item.avatarUrl}
        tamanho={AVATAR_TAMANHO[posicao]}
        className={AVATAR_RING[posicao]}
      />
      <span
        className={`-mt-2 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${BADGE_CLASSES[posicao]}`}
        aria-hidden="true"
      >
        {posicao}
      </span>
      <p className={`max-w-[72px] truncate text-center ${NOME_CLASSES[posicao]}`} title={item.nome}>
        {nomeExibido}
      </p>
      <p className={PONTOS_CLASSES[posicao]}>
        {item.pontosTotais} {item.pontosTotais === 1 ? "pt" : "pts"}
      </p>
      {/* Coluna decorativa do pódio — altura proporcional à posição */}
      <div
        className={`mt-2 w-16 rounded-t-xl bg-white/20 ${COLUNA_HEIGHT[posicao]}`}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Pódio visual do ranking: exibe o top-3 na ordem 2º | 1º | 3º,
 * com o líder mais alto. Quando há apenas 1 participante, exibe
 * o líder centralizado sem os demais pedestais.
 */
export function Podio({ top3, meuParticipanteId }: PodioProps) {
  const primeiro = top3.at(0);
  const segundo = top3.at(1);
  const terceiro = top3.at(2);

  if (!primeiro) return null;

  if (top3.length === 1) {
    return (
      <section
        className="rounded-2xl bg-gradient-to-b from-brand-800 to-brand-900 p-5 text-white shadow-sm"
        aria-label="Pódio"
      >
        <div className="flex items-end justify-center">
          <PodioItem
            item={primeiro}
            posicao={1}
            ehMeuPerfil={primeiro.participanteId === meuParticipanteId}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl bg-gradient-to-b from-brand-800 to-brand-900 p-5 text-white shadow-sm"
      aria-label="Pódio — top 3"
    >
      <div className="flex items-end justify-center gap-4">
        {segundo && (
          <PodioItem
            item={segundo}
            posicao={2}
            ehMeuPerfil={segundo.participanteId === meuParticipanteId}
          />
        )}
        <PodioItem
          item={primeiro}
          posicao={1}
          ehMeuPerfil={primeiro.participanteId === meuParticipanteId}
        />
        {terceiro && (
          <PodioItem
            item={terceiro}
            posicao={3}
            ehMeuPerfil={terceiro.participanteId === meuParticipanteId}
          />
        )}
      </div>
    </section>
  );
}
