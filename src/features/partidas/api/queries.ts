import { useQuery } from "@tanstack/react-query";
import { listarPartidas } from "./partidas-fetcher";

export const partidasKeys = {
  all: ["partidas"] as const,
};

export function usePartidas() {
  return useQuery({
    queryKey: partidasKeys.all,
    queryFn: () => listarPartidas(),
  });
}
