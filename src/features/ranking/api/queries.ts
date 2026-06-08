import { useQuery } from "@tanstack/react-query";
import { listarRanking } from "./ranking-fetcher";
import { listarDestaqueRodada } from "./destaque-rodada-fetcher";

export const rankingKeys = {
  all: ["ranking"] as const,
};

export const destaqueRodadaKeys = {
  /** Chave sem rodada → consulta a última rodada apurada (RPC usa default). */
  ultima: () => ["destaque-rodada"] as const,
  /** Chave com rodada específica → cache separado por jornada. */
  porRodada: (rodada: number) => ["destaque-rodada", rodada] as const,
};

/**
 * O ranking só muda quando a apuração de pontos roda (trigger no banco após
 * marcar partida como encerrada). staleTime de 2 minutos reduz refetches
 * desnecessários sem prejudicar a consistência.
 */
export function useRanking() {
  return useQuery({
    queryKey: rankingKeys.all,
    queryFn: () => listarRanking(),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * @param rodada - Número da jornada a consultar. Se omitido, a RPC retorna
 *   automaticamente a última rodada com jogo encerrado/apurado.
 *
 * staleTime de 2 minutos: o destaque só muda após a apuração de pontos
 * (trigger no banco), então atualizações frequentes não trazem benefício.
 *
 * Array vazio = nenhum jogo da rodada foi encerrado ainda, ou todos
 * pontuaram 0. O componente deve tratar esse estado graciosamente.
 */
export function useDestaqueRodada(rodada?: number) {
  return useQuery({
    queryKey:
      rodada !== undefined ? destaqueRodadaKeys.porRodada(rodada) : destaqueRodadaKeys.ultima(),
    queryFn: () => listarDestaqueRodada(rodada),
    staleTime: 2 * 60 * 1000,
  });
}
