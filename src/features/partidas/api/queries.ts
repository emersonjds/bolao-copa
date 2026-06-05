import { useQuery } from "@tanstack/react-query";
import { listarPartidas } from "./partidas-fetcher";

export const partidasKeys = {
  all: ["partidas"] as const,
};

/**
 * Retorna todas as partidas ordenadas por data_hora.
 * Lê diretamente do Supabase — MSW não intercepta mais este caminho.
 */
export function usePartidas() {
  return useQuery({
    queryKey: partidasKeys.all,
    queryFn: () => listarPartidas(),
  });
}
