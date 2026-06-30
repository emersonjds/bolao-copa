import { listarPartidas } from "@/features/partidas";
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
    .sort(
      (a, b) => (a.numero ?? Number.MAX_SAFE_INTEGER) - (b.numero ?? Number.MAX_SAFE_INTEGER)
    );
}
