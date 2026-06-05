import { useQuery } from "@tanstack/react-query";
import { listarRanking } from "./ranking-fetcher";

export const rankingKeys = {
  all: ["ranking"] as const,
};

/**
 * Classificação dos participantes do bolão.
 *
 * Assinatura: () => UseQueryResult<ItemRanking[], Error>
 *
 * O ranking só muda quando a apuração de pontos roda (trigger no banco após
 * marcar partida como encerrada). staleTime de 2 minutos reduz refetches
 * desnecessários sem prejudicar a consistência.
 *
 * Depende da RPC get_ranking() (migration 0005 pendente). Enquanto a função
 * não existir no banco, isError será true e data será undefined — o
 * componente deve tratar o estado de erro com mensagem amigável.
 */
export function useRanking() {
  return useQuery({
    queryKey: rankingKeys.all,
    queryFn: () => listarRanking(),
    staleTime: 2 * 60 * 1000,
  });
}
