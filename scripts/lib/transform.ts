import { FIFA_CODES } from "./fifa-codes";

export type Fase =
  | "grupos"
  | "trinta-e-dois"
  | "oitavas"
  | "quartas"
  | "semifinal"
  | "terceiro-lugar"
  | "final";

const ROUND_TO_FASE: Record<string, Fase> = {
  "Round of 32": "trinta-e-dois",
  "Round of 16": "oitavas",
  "Quarter-final": "quartas",
  "Semi-final": "semifinal",
  "Match for third place": "terceiro-lugar",
  Final: "final",
};

/** Converte data + "HH:MM UTC-N" do openfootball para ISO 8601 em UTC. */
export function parseKickoffToUtc(date: string, time: string): string {
  const match = time.match(/^(\d{2}):(\d{2})\s+UTC([+-]\d{1,2})$/);
  if (!match) {
    throw new Error(`Horário em formato inesperado: "${time}"`);
  }
  const [, hh, mm, offset] = match;
  const sign = offset.startsWith("-") ? "-" : "+";
  const abs = Math.abs(Number(offset)).toString().padStart(2, "0");
  // Monta um instante com offset explícito e normaliza para UTC.
  const iso = `${date}T${hh}:${mm}:00${sign}${abs}:00`;
  return new Date(iso).toISOString();
}

/** "Matchday N" → grupos; demais rounds via tabela. */
export function roundToFase(round: string): Fase {
  if (round.startsWith("Matchday")) return "grupos";
  const fase = ROUND_TO_FASE[round];
  if (!fase) throw new Error(`Round sem mapeamento de fase: "${round}"`);
  return fase;
}

/** "Group A" → "A"; ausência de grupo (mata-mata) → null. */
export function parseGroup(group: string | undefined): string | null {
  if (!group) return null;
  return group.replace(/^Group\s+/, "");
}

/** Placeholders: posição de grupo ("2A", "3A/B/C/D/F") ou referência de jogo ("W74", "L101"). */
export function isPlaceholderTeam(team: string): boolean {
  return /^\d/.test(team) || /^[WL]\d+$/.test(team);
}

/** Nome da seleção → código FIFA; erro barulhento se faltar no mapa. */
export function fifaCode(name: string): string {
  const code = FIFA_CODES[name];
  if (!code) throw new Error(`Seleção sem código FIFA: "${name}"`);
  return code;
}
