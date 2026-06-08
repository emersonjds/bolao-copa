"use client";

import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import { CardPalpite } from "./card-palpite";
import type { PlacarLocal } from "./card-palpite";

interface ListaPalpitesProps {
  partidas: Partida[];
  meusPalpites: Palpite[];
  placaresLocais: Record<string, PlacarLocal>;
  onChangePlacar: (partidaId: string, campo: "mandante" | "visitante", valor: string) => void;
  isSaving: boolean;
}

function getDataUtc(dataHora: string): string {
  return dataHora.slice(0, 10);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Usa noon UTC para evitar desvio de fuso ao parsear só a data. */
function formatarCabecalho(dataStr: string, rodada: number): string {
  const data = new Date(`${dataStr}T12:00:00Z`);
  const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
  const dia = data.toLocaleDateString("pt-BR", { day: "numeric", timeZone: "UTC" });
  const mes = data.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });

  const diaSemanaFormatado = capitalize(diaSemana.replace(".", "").trim());
  const mesFormatado = mes.replace(".", "").trim();

  return `Rodada ${rodada} · ${diaSemanaFormatado}, ${dia} ${mesFormatado}`;
}

export function ListaPalpites({
  partidas,
  meusPalpites,
  placaresLocais,
  onChangePlacar,
  isSaving,
}: ListaPalpitesProps) {
  if (partidas.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhum jogo nesta fase por enquanto.
      </p>
    );
  }

  const grupos = new Map<string, Partida[]>();
  for (const partida of partidas) {
    const dataStr = getDataUtc(partida.dataHora);
    const grupo = grupos.get(dataStr) ?? [];
    grupo.push(partida);
    grupos.set(dataStr, grupo);
  }

  const datasOrdenadas = [...grupos.keys()].sort();

  return (
    <div className="space-y-2">
      {datasOrdenadas.map((dataStr, indice) => {
        const partidasDoDia = grupos.get(dataStr) ?? [];
        const cabecalho = formatarCabecalho(dataStr, indice + 1);

        return (
          <section key={dataStr} aria-labelledby={`grupo-data-${dataStr}`}>
            {/* Sticky abaixo do TopBar (h-14 = top-14) */}
            <div
              id={`grupo-data-${dataStr}`}
              className="sticky top-14 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur"
            >
              <span className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
                {cabecalho}
              </span>
            </div>

            <div className="mt-2 space-y-3 pb-2">
              {partidasDoDia.map((partida) => (
                <CardPalpite
                  key={partida.id}
                  partida={partida}
                  palpiteSalvo={meusPalpites.find((p) => p.partidaId === partida.id)}
                  placarLocal={placaresLocais[partida.id]}
                  onChangeMandante={(valor) => onChangePlacar(partida.id, "mandante", valor)}
                  onChangeVisitante={(valor) => onChangePlacar(partida.id, "visitante", valor)}
                  disabled={isSaving}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
