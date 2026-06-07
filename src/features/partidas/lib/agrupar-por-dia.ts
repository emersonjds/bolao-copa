import type { Partida } from "@/entities/partida";

// Dia-calendário no fuso de São Paulo (en-CA dá YYYY-MM-DD). Fixo, não o do
// navegador: a Copa é nas Américas, e o dia do jogo precisa ser estável.
const diaSaoPaulo = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export interface GrupoDia {
  /** Chave YYYY-MM-DD (fuso de São Paulo) do dia de jogo. */
  data: string;
  jogos: Partida[];
}

/**
 * Agrupa os jogos ainda NÃO encerrados pelos próximos `maxDias` dias com partidas
 * (fuso de São Paulo), trazendo todos os jogos de cada dia. Dias sem jogo são
 * pulados automaticamente — então "hoje + amanhã" vira "os 2 próximos dias com jogo".
 */
export function agruparProximosDias(partidas: Partida[], maxDias = 2): GrupoDia[] {
  const abertas = partidas
    .filter((partida) => partida.status !== "encerrada")
    .slice()
    .sort((a, b) => a.dataHora.localeCompare(b.dataHora));

  const porDia = new Map<string, Partida[]>();
  for (const partida of abertas) {
    const dia = diaSaoPaulo.format(new Date(partida.dataHora));
    const jogosDoDia = porDia.get(dia);
    if (jogosDoDia) jogosDoDia.push(partida);
    else porDia.set(dia, [partida]);
  }

  return [...porDia.entries()].slice(0, maxDias).map(([data, jogos]) => ({ data, jogos }));
}
