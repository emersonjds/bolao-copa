import type { Partida, FaseCopa } from "@/entities/partida";

export interface GrupoDiaData {
  dateKey: string;
  date: Date;
  partidas: Partida[];
}

/**
 * Converts a Date to a local-timezone "YYYY-MM-DD" key used throughout the
 * Calendário feature to group and compare days.
 */
export function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

export function formatarHeaderDia(date: Date): string {
  const dia = DIAS_SEMANA_ABREV[date.getDay()];
  const numero = date.getDate();
  const mes = MESES_ABREV[date.getMonth()];
  return `${dia}, ${numero} ${mes}`.toUpperCase();
}

/**
 * Formats an ISO-8601 datetime string as "HHhMM" in the user's local timezone,
 * e.g. "16h00".
 */
export function formatarHorario(dataHora: string): string {
  const date = new Date(dataHora);
  const horas = String(date.getHours()).padStart(2, "0");
  const minutos = String(date.getMinutes()).padStart(2, "0");
  return `${horas}h${minutos}`;
}

/**
 * Returns the Sunday that starts the ISO-week containing `date`, at midnight
 * local time. Used to anchor the 7-day SeletorSemana window.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

const FASE_ABREV: Record<FaseCopa, string> = {
  grupos: "Grupos",
  "trinta-e-dois": "R32",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semis",
  "terceiro-lugar": "3º lugar",
  final: "Final",
};

export function getFaseBadge(partida: Partida): string {
  if (partida.fase === "grupos" && partida.grupo) {
    return `Gr.${partida.grupo}`;
  }
  return FASE_ABREV[partida.fase];
}

export function groupByDay(partidas: readonly Partida[]): GrupoDiaData[] {
  const map = new Map<string, { date: Date; partidas: Partida[] }>();

  for (const partida of partidas) {
    const date = new Date(partida.dataHora);
    const key = toDateKey(date);
    const existing = map.get(key);
    if (existing) {
      existing.partidas.push(partida);
    } else {
      map.set(key, { date, partidas: [partida] });
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, { date, partidas }]) => ({ dateKey, date, partidas }));
}
