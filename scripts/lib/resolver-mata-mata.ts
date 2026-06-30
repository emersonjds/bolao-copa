import { BRACKET_2026, type FaseMataMata } from "./bracket-2026";
import type { StatusPartida } from "@/entities/partida";

export interface PartidaResultado {
  numero: number;
  fase: FaseMataMata;
  mandanteId: string | null;
  visitanteId: string | null;
  golsMandante: number | null;
  golsVisitante: number | null;
  vencedorPenaltis: string | null;
  status: StatusPartida;
}

export interface ConfrontoResolvido {
  fase: FaseMataMata;
  mandanteLabel: string;
  visitanteLabel: string;
  mandanteId: string;
  visitanteId: string;
}

const REF = /^([WL])(\d+)$/;
const FASES_A_RESOLVER: FaseMataMata[] = [
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
];

function vencedor(p: PartidaResultado): string | null {
  if (p.status !== "encerrada" || p.golsMandante === null || p.golsVisitante === null) return null;
  if (p.golsMandante > p.golsVisitante) return p.mandanteId;
  if (p.golsVisitante > p.golsMandante) return p.visitanteId;
  return p.vencedorPenaltis; // empate no tempo normal → pênaltis definem quem avança
}

function perdedor(p: PartidaResultado): string | null {
  const venc = vencedor(p);
  if (!venc) return null;
  return venc === p.mandanteId ? p.visitanteId : p.mandanteId;
}

export function resolverMataMata(partidas: PartidaResultado[]): ConfrontoResolvido[] {
  const porNumero = new Map(partidas.map((p) => [p.numero, p]));

  const resolverLabel = (label: string): string | null => {
    const m = label.match(REF);
    if (!m) return null;
    const origem = porNumero.get(Number(m[2]));
    if (!origem) return null;
    return m[1] === "W" ? vencedor(origem) : perdedor(origem);
  };

  const out: ConfrontoResolvido[] = [];
  for (const slot of BRACKET_2026) {
    if (!FASES_A_RESOLVER.includes(slot.fase)) continue;
    const atual = porNumero.get(slot.numero);
    if (atual?.mandanteId && atual?.visitanteId) continue; // idempotente: já resolvida
    const mandanteId = resolverLabel(slot.mandanteLabel);
    const visitanteId = resolverLabel(slot.visitanteLabel);
    if (mandanteId && visitanteId) {
      out.push({
        fase: slot.fase,
        mandanteLabel: slot.mandanteLabel,
        visitanteLabel: slot.visitanteLabel,
        mandanteId,
        visitanteId,
      });
    }
  }
  return out;
}
