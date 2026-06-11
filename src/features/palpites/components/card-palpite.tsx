"use client";

import { Check, Clock, Lock } from "lucide-react";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import { FlagIcon } from "@/shared/ui/flag-icon";
import type { EstadoPalpite } from "../lib/estado-palpite";

export interface PlacarLocal {
  mandante: string;
  visitante: string;
}

interface CardPalpiteProps {
  partida: Partida;
  estado: EstadoPalpite;
  palpiteSalvo: Palpite | undefined;
  placarLocal: PlacarLocal | undefined;
  onChangeMandante: (valor: string) => void;
  onChangeVisitante: (valor: string) => void;
  disabled: boolean;
}

const FASE_LABEL: Record<string, string> = {
  grupos: "Grupos",
  "trinta-e-dois": "R32",
  oitavas: "Oitavas",
  quartas: "Quartas",
  semifinal: "Semis",
  "terceiro-lugar": "3º Lugar",
  final: "Final",
};

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
});

const formatadorHora = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Confronto indefinido: fase mata-mata cujos times ainda não foram definidos.
 * O tipo Selecao.codigo é string (nunca null), mas o banco pode devolver
 * string vazia para partidas de mata-mata não finalizadas.
 */
function isConfrontoIndefinido(partida: Partida): boolean {
  return !partida.mandante.codigo || !partida.visitante.codigo;
}

const INPUT_BASE =
  "h-11 w-12 rounded-xl border border-input bg-background text-center font-mono text-xl font-bold text-foreground outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 disabled:cursor-not-allowed disabled:opacity-50 xsm:h-12 xsm:w-14 xsm:text-2xl";

const INPUT_TRAVADO =
  "h-11 w-12 cursor-not-allowed rounded-xl border border-transparent bg-muted text-center font-mono text-xl font-bold text-muted-foreground xsm:h-12 xsm:w-14 xsm:text-2xl";

export function CardPalpite({
  partida,
  estado,
  palpiteSalvo,
  placarLocal,
  onChangeMandante,
  onChangeVisitante,
  disabled,
}: CardPalpiteProps) {
  const indefinido = isConfrontoIndefinido(partida);

  // Valor exibido: local (em edição) → salvo → vazio
  const valorMandante =
    placarLocal?.mandante ?? (palpiteSalvo ? String(palpiteSalvo.golsMandante) : "");
  const valorVisitante =
    placarLocal?.visitante ?? (palpiteSalvo ? String(palpiteSalvo.golsVisitante) : "");

  // Pendente: placarLocal existe, ambos os campos preenchidos e diferem do salvo
  const hasPendente = (() => {
    if (!placarLocal) return false;
    if (placarLocal.mandante === "" || placarLocal.visitante === "") return false;
    if (!palpiteSalvo) return true;
    return (
      placarLocal.mandante !== String(palpiteSalvo.golsMandante) ||
      placarLocal.visitante !== String(palpiteSalvo.golsVisitante)
    );
  })();

  const hasSalvo = !!palpiteSalvo && !hasPendente;

  const badgeGrupo = partida.grupo
    ? `Grupo ${partida.grupo}`
    : (FASE_LABEL[partida.fase] ?? partida.fase);

  const dataFormatada = formatadorData.format(new Date(partida.dataHora)).replace(" de ", " ");
  const horaFormatada = formatadorHora.format(new Date(partida.dataHora)).replace(":", "h");
  const horarioDisplay = `${dataFormatada} · ${horaFormatada}`;

  if (indefinido) {
    return (
      <article className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            {badgeGrupo}
          </span>
          <span className="rounded-full bg-sky-700 px-2 py-0.5 text-[11px] font-medium text-white">{horarioDisplay}</span>
        </div>
        <p className="py-2 text-center text-sm text-muted-foreground">
          Classificados após os jogos de grupos
        </p>
      </article>
    );
  }

  if (estado === "encerrado") {
    const temPlacarOficial = partida.golsMandante !== null && partida.golsVisitante !== null;

    return (
      <article className="rounded-2xl border border-border bg-card/60 p-4 opacity-80">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            {badgeGrupo}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Travado
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <FlagIcon
              codigoFifa={partida.mandante.codigo}
              nome={partida.mandante.nome}
              tamanho="md"
            />
            <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
              {partida.mandante.nome}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              value={valorMandante}
              readOnly
              disabled
              aria-label={`Gols do ${partida.mandante.nome}`}
              aria-disabled="true"
              className={INPUT_TRAVADO}
            />
            <span className="font-mono text-lg font-bold text-muted-foreground" aria-hidden="true">
              ×
            </span>
            <input
              type="number"
              value={valorVisitante}
              readOnly
              disabled
              aria-label={`Gols do ${partida.visitante.nome}`}
              aria-disabled="true"
              className={INPUT_TRAVADO}
            />
          </div>

          <div className="flex flex-1 flex-col items-center gap-1.5">
            <FlagIcon
              codigoFifa={partida.visitante.codigo}
              nome={partida.visitante.nome}
              tamanho="md"
            />
            <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
              {partida.visitante.nome}
            </span>
          </div>
        </div>

        {temPlacarOficial && (
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Resultado oficial: {partida.golsMandante} × {partida.golsVisitante}
            </span>
            {palpiteSalvo && palpiteSalvo.pontos !== null && (
              <span className="rounded-full bg-brand-800 px-2.5 py-0.5 font-mono text-sm font-bold text-gold-400">
                {palpiteSalvo.pontos} {palpiteSalvo.pontos === 1 ? "pt" : "pts"}
              </span>
            )}
          </div>
        )}
      </article>
    );
  }

  if (estado === "futuro") {
    const temRascunho =
      !!placarLocal && placarLocal.mandante !== "" && placarLocal.visitante !== "";
    return (
      <article className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            {badgeGrupo}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            <Clock className="h-3 w-3" aria-hidden="true" />
            Libera amanhã
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <FlagIcon
              codigoFifa={partida.mandante.codigo}
              nome={partida.mandante.nome}
              tamanho="md"
            />
            <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
              {partida.mandante.nome}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              value={valorMandante}
              onChange={(e) => onChangeMandante(e.target.value)}
              disabled={disabled}
              aria-label={`Gols do ${partida.mandante.nome}`}
              className={INPUT_BASE}
            />
            <span className="font-mono text-lg font-bold text-muted-foreground" aria-hidden="true">
              ×
            </span>
            <input
              type="number"
              min={0}
              max={20}
              inputMode="numeric"
              value={valorVisitante}
              onChange={(e) => onChangeVisitante(e.target.value)}
              disabled={disabled}
              aria-label={`Gols do ${partida.visitante.nome}`}
              className={INPUT_BASE}
            />
          </div>
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <FlagIcon
              codigoFifa={partida.visitante.codigo}
              nome={partida.visitante.nome}
              tamanho="md"
            />
            <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
              {partida.visitante.nome}
            </span>
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-amber-700">
          {temRascunho
            ? "Rascunho guardado · salva quando liberar"
            : "Você pode preparar seu palpite aqui"}
        </p>
      </article>
    );
  }

  const wrapperClass = hasPendente
    ? "rounded-2xl border border-brand-400 bg-card p-4 shadow-sm ring-1 ring-brand-400/30"
    : hasSalvo
      ? "rounded-2xl border border-brand-200 bg-card p-4 shadow-sm"
      : "rounded-2xl border border-border bg-card p-4 shadow-sm";

  return (
    <article className={wrapperClass}>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
          {badgeGrupo}
        </span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-sky-700 px-2 py-0.5 text-[11px] font-medium text-white">{horarioDisplay}</span>
          {hasSalvo && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
              <Check className="h-3 w-3" aria-hidden="true" />
              Salvo
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <FlagIcon
            codigoFifa={partida.mandante.codigo}
            nome={partida.mandante.nome}
            tamanho="md"
          />
          <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
            {partida.mandante.nome}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            value={valorMandante}
            onChange={(e) => onChangeMandante(e.target.value)}
            disabled={disabled}
            aria-label={`Gols do ${partida.mandante.nome}`}
            className={INPUT_BASE}
          />
          <span className="font-mono text-lg font-bold text-muted-foreground" aria-hidden="true">
            ×
          </span>
          <input
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            value={valorVisitante}
            onChange={(e) => onChangeVisitante(e.target.value)}
            disabled={disabled}
            aria-label={`Gols do ${partida.visitante.nome}`}
            className={INPUT_BASE}
          />
        </div>

        <div className="flex flex-1 flex-col items-center gap-1.5">
          <FlagIcon
            codigoFifa={partida.visitante.codigo}
            nome={partida.visitante.nome}
            tamanho="md"
          />
          <span className="max-w-[80px] truncate text-center text-xs font-medium text-foreground">
            {partida.visitante.nome}
          </span>
        </div>
      </div>
    </article>
  );
}
