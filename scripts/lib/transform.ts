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

/**
 * Fases do mata-mata em ordem cronológica do calendário.
 * A posição (índice 0-based) define o offset de rodada após o último Matchday.
 * Ex.: se o último Matchday for 3, "Round of 32" → rodada 4.
 */
const KNOCKOUT_ORDER = [
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Match for third place",
  "Final",
] as const;

type KnockoutRound = (typeof KNOCKOUT_ORDER)[number];

function isKnockoutRound(round: string): round is KnockoutRound {
  return (KNOCKOUT_ORDER as ReadonlyArray<string>).includes(round);
}

/**
 * Converte o campo "round" do openfootball para o número sequencial de rodada.
 *
 * Regras:
 *   - "Matchday N"  → rodada N (extraído diretamente do texto).
 *   - Mata-mata     → rodadas sequenciais a partir de `maxGroupMatchday + 1`,
 *                     na ordem cronológica do calendário definida por KNOCKOUT_ORDER.
 *
 * @param round          - valor bruto do campo "round" no JSON do openfootball
 * @param maxGroupMatchday - maior número de Matchday encontrado na fase de grupos;
 *                           usado apenas para calcular o offset do mata-mata
 */
export function roundToRodada(round: string, maxGroupMatchday: number): number {
  if (round.startsWith("Matchday ")) {
    const n = parseInt(round.slice("Matchday ".length), 10);
    if (!Number.isFinite(n) || n <= 0) {
      throw new Error(`Matchday sem número válido: "${round}"`);
    }
    return n;
  }

  if (!isKnockoutRound(round)) {
    throw new Error(`Round sem mapeamento de rodada: "${round}"`);
  }

  // idx 0 → maxGroupMatchday + 1, idx 1 → maxGroupMatchday + 2, ...
  const idx = KNOCKOUT_ORDER.indexOf(round);
  return maxGroupMatchday + idx + 1;
}

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
