import { listarPartidas } from "@/features/partidas/api/partidas-fetcher";
import type { FaseCopa, Partida } from "@/entities/partida";

const FASES_MATA_MATA: Set<FaseCopa> = new Set([
  "trinta-e-dois",
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
]);

export async function buscarPartidasMataMata(): Promise<Partida[]> {
  const todas = await listarPartidas();
  return todas
    .filter((p) => FASES_MATA_MATA.has(p.fase))
    .sort((a, b) => {
      if (a.numero == null && b.numero == null) return 0;
      if (a.numero == null) return 1;
      if (b.numero == null) return -1;
      return a.numero - b.numero;
    });
}
