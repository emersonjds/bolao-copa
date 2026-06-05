import { apiUrl } from "@/shared/lib/api-url";
import type { Partida } from "@/entities/partida";

interface ListarPartidasResponse {
  partidas: Partida[];
}

export async function listarPartidas(signal?: AbortSignal): Promise<Partida[]> {
  const res = await fetch(apiUrl("/api/partidas"), {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Falha ao carregar partidas (HTTP ${res.status})`);
  }
  const json = (await res.json()) as ListarPartidasResponse;
  return json.partidas;
}
