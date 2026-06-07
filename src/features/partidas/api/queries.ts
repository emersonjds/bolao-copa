import { useQuery } from "@tanstack/react-query";
import { listarPartidas } from "./partidas-fetcher";

export const partidasKeys = {
  all: ["partidas"] as const,
};

export function usePartidas() {
  return useQuery({
    queryKey: partidasKeys.all,
    queryFn: () => listarPartidas(),
    // Partidas mudam pouco (placar só quando o admin apura). Evita refetch a
    // cada troca de aba; a apuração invalida a query quando há mudança real.
    staleTime: 10 * 60 * 1000,
  });
}
