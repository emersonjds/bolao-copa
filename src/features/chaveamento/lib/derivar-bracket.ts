import type { FaseCopa, Partida, Selecao, StatusPartida } from "@/entities/partida";

export interface LadoConfronto {
  selecao: Selecao | null;
  placeholder: string;
  gols: number | null;
  vencedor: boolean;
}

export interface ConfrontoBracket {
  numero: number;
  fase: FaseCopa;
  mandante: LadoConfronto;
  visitante: LadoConfronto;
  status: StatusPartida;
}

export interface RodadaBracket {
  fase: FaseCopa;
  titulo: string;
  confrontos: ConfrontoBracket[];
}

// ponytail: numero por posição dentro da fase + offset fixo da topologia oficial
// (32-avos 73, oitavas 89, quartas 97, semi 101, 3º 103, final 104) — Partida não expõe numero
const FASE_CONFIG: Array<{ fase: FaseCopa; titulo: string; offset: number }> = [
  { fase: "trinta-e-dois", titulo: "32-avos", offset: 73 },
  { fase: "oitavas", titulo: "Oitavas", offset: 89 },
  { fase: "quartas", titulo: "Quartas", offset: 97 },
  { fase: "semifinal", titulo: "Semifinal", offset: 101 },
  { fase: "terceiro-lugar", titulo: "Disputa de 3º lugar", offset: 103 },
  { fase: "final", titulo: "Final", offset: 104 },
];

const LABEL_RE = /^([WL])(\d+)$/;

function traduzirLabel(label: string | null): string {
  if (!label) return "";
  const match = LABEL_RE.exec(label);
  if (!match) return label;
  return match[1] === "W" ? `Vencedor ${match[2]}` : `Perdedor ${match[2]}`;
}

function derivarLado(
  selecao: Selecao,
  label: string | null,
  gols: number | null,
  encerrada: boolean,
  eVencedor: boolean
): LadoConfronto {
  const resolvida = selecao.codigo ? selecao : null;
  return {
    selecao: resolvida,
    placeholder: resolvida ? resolvida.nome : traduzirLabel(label),
    gols: encerrada ? gols : null,
    vencedor: encerrada && eVencedor,
  };
}

export function derivarBracket(partidas: Partida[]): RodadaBracket[] {
  const rodadas: RodadaBracket[] = [];

  for (const { fase, titulo, offset } of FASE_CONFIG) {
    const dafase = partidas
      .filter((p) => p.fase === fase)
      .sort((a, b) => a.dataHora.localeCompare(b.dataHora));

    if (dafase.length === 0) continue;

    const confrontos: ConfrontoBracket[] = dafase.map((partida, i) => {
      const encerrada = partida.status === "encerrada";

      // ponytail: regra de vencedor local — spec proíbe importar de scripts/lib (duplicação consciente)
      const mGols = partida.golsMandante;
      const vGols = partida.golsVisitante;
      const mandanteVence =
        mGols !== null && vGols !== null
          ? mGols > vGols || (mGols === vGols && partida.vencedorPenaltis === partida.mandante.id)
          : false;
      const visitanteVence =
        mGols !== null && vGols !== null
          ? vGols > mGols || (mGols === vGols && partida.vencedorPenaltis === partida.visitante.id)
          : false;

      return {
        numero: offset + i,
        fase,
        mandante: derivarLado(partida.mandante, partida.mandanteLabel, mGols, encerrada, mandanteVence),
        visitante: derivarLado(partida.visitante, partida.visitanteLabel, vGols, encerrada, visitanteVence),
        status: partida.status,
      };
    });

    rodadas.push({ fase, titulo, confrontos });
  }

  return rodadas;
}
