"use client";

import { AvatarParticipante } from "@/shared/ui/avatar-participante";
import type { ItemRanking } from "@/entities/ranking";

interface ListaRankingProps {
  /** Itens da posição 4 em diante, já fatiados pelo componente pai. */
  items: ItemRanking[];
  meuParticipanteId: string | null;
  /** Número da posição do primeiro item (padrão: 4). */
  startPosition?: number;
}

interface ItemRankingRowProps {
  item: ItemRanking;
  posicao: number;
  ehMeuPerfil: boolean;
}

function ItemRankingRow({ item, posicao, ehMeuPerfil }: ItemRankingRowProps) {
  // Espelha o padrão do pódio: a própria linha vira "Você" em vez do nome,
  // tornando o banner separado redundante (decisão de UX — uma identidade só).
  const nomeExibido = ehMeuPerfil ? "Você" : item.nome;

  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm transition-colors ${
        ehMeuPerfil ? "border-brand-200 bg-brand-50/50" : "border-border bg-card"
      }`}
      aria-current={ehMeuPerfil ? "true" : undefined}
    >
      {/* Número da posição */}
      <span
        className="w-6 shrink-0 text-right font-mono text-sm font-bold text-muted-foreground"
        aria-label={`${posicao}º lugar`}
      >
        {posicao}
      </span>

      <AvatarParticipante
        nome={item.nome}
        avatarUrl={item.avatarUrl}
        tamanho={36}
        className="shrink-0 ring-1 ring-brand-200"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-semibold text-foreground" title={item.nome}>
          {nomeExibido}
        </p>
        <p className="text-xs text-muted-foreground">
          {item.jogosPontuados} {item.jogosPontuados === 1 ? "jogo pontuado" : "jogos pontuados"}
        </p>
      </div>

      <span className="shrink-0 font-mono text-sm font-bold text-foreground">
        {item.pontosTotais} {item.pontosTotais === 1 ? "pt" : "pts"}
      </span>

      {/* Âncora visual: substitui o antigo banner "Sua posição" */}
      {ehMeuPerfil && (
        <span className="shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
          Você
        </span>
      )}
    </li>
  );
}

/**
 * Lista de participantes a partir da 4ª posição.
 * Retorna null quando a lista está vazia (sem ruído visual desnecessário).
 */
export function ListaRanking({ items, meuParticipanteId, startPosition = 4 }: ListaRankingProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="lista-ranking-heading">
      <h2 id="lista-ranking-heading" className="sr-only">
        Demais participantes
      </h2>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <ItemRankingRow
            key={item.participanteId}
            item={item}
            posicao={startPosition + index}
            ehMeuPerfil={item.participanteId === meuParticipanteId}
          />
        ))}
      </ul>
    </section>
  );
}
