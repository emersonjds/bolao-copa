import { useQuery } from "@tanstack/react-query";
import { listarRanking } from "./ranking-fetcher";
import { listarDestaqueDia } from "./destaque-dia-fetcher";

export const rankingKeys = {
  all: ["ranking"] as const,
};

export const destaqueDiaKeys = {
  /** Chave sem dia → consulta o dia apurado mais recente (RPC usa default). */
  ultimo: () => ["destaque-dia"] as const,
  /** Chave com dia específico → cache separado por dia. */
  porDia: (dia: string) => ["destaque-dia", dia] as const,
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
 * @param dia - Dia a consultar (ISO `YYYY-MM-DD`). Se omitido, a RPC retorna
 *   automaticamente o dia com jogo encerrado mais recente (fuso de Brasília).
 *
 * staleTime de 2 minutos: o destaque só muda após a apuração de pontos
 * (trigger no banco), então atualizações frequentes não trazem benefício.
 *
 * Array vazio = nenhum jogo do dia foi encerrado ainda, ou todos
 * pontuaram 0. O componente deve tratar esse estado graciosamente.
 */
export function useDestaqueDia(dia?: string) {
  return useQuery({
    queryKey: dia !== undefined ? destaqueDiaKeys.porDia(dia) : destaqueDiaKeys.ultimo(),
    queryFn: () => listarDestaqueDia(dia),
    staleTime: 2 * 60 * 1000,
  });
}
