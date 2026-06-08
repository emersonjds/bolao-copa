import { useQuery } from "@tanstack/react-query";
import { contarInscritos } from "./contagem-inscritos";

export const premiacaoKeys = {
  inscritos: ["premiacao", "inscritos"] as const,
};

export function useContagemInscritos() {
  return useQuery({
    queryKey: premiacaoKeys.inscritos,
    queryFn: () => contarInscritos(),
    // Número de inscritos muda devagar; 10 min evita refetch a cada visita.
    staleTime: 10 * 60 * 1000,
  });
}
