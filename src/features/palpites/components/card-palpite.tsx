"use client";

import { Check, Clock, Lock } from "lucide-react";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import { FlagIcon } from "@/shared/ui/flag-icon";
import type { EstadoPalpite } from "../lib/estado-palpite";
import { vencedorAvancaEfetivo } from "../lib/vencedor-avanca";

export interface PlacarLocal {
  mandante: string;
  visitante: string;
  vencedorAvanca?: string | null;
}

interface CardPalpiteProps {
  partida: Partida;
  estado: EstadoPalpite;
  palpiteSalvo: Palpite | undefined;
  placarLocal: PlacarLocal | undefined;
  onChangeMandante: (valor: string) => void;
  onChangeVisitante: (valor: string) => void;
  onChangeVencedorAvanca: (selecaoId: string | null) => void;
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
  onChangeVencedorAvanca,
  disabled,
}: CardPalpiteProps) {
  const indefinido = isConfrontoIndefinido(partida);

  const valorMandante =
    placarLocal?.mandante ?? (palpiteSalvo ? String(palpiteSalvo.golsMandante) : "");
  const valorVisitante =
    placarLocal?.visitante ?? (palpiteSalvo ? String(palpiteSalvo.golsVisitante) : "");

  const ehMataMata = partida.fase !== "grupos";
  const empate =
    valorMandante !== "" &&
    valorVisitante !== "" &&
    valorMandante === valorVisitante;
  const vencedorAvanca = vencedorAvancaEfetivo(
    placarLocal?.vencedorAvanca,
    palpiteSalvo?.vencedorAvanca
  );
  const labelQuemAvanca =
    partida.fase === "terceiro-lugar" ? "Quem vence?" : "Quem passa?";

  const hasPendente = (() => {
    if (!placarLocal) return false;
    if (placarLocal.mandante === "" || placarLocal.visitante === "") return false;
    if (!palpiteSalvo) return true;
    if (
      placarLocal.mandante !== String(palpiteSalvo.golsMandante) ||
      placarLocal.visitante !== String(palpiteSalvo.golsVisitante)
    ) {
      return true;
    }
    // Empate de mata-mata: trocar só o "quem passa" também é uma pendência.
    if (ehMataMata && empate) {
      return vencedorAvanca !== (palpiteSalvo.vencedorAvanca ?? null);
    }
    return false;
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
          <span className="rounded-full bg-sky-700 px-2 py-0.5 text-[11px] font-medium text-white">
            {horarioDisplay}
          </span>
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
            <span className="max-w-20 truncate text-center text-xs font-medium text-foreground">
              {partida.mandante.nome}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
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
              type="text"
              inputMode="numeric"
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
            <span className="max-w-20 truncate text-center text-xs font-medium text-foreground">
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
    return (
      <article className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-semibold text-brand-700">
            {badgeGrupo}
          </span>
          <div className="flex items-center gap-2">
            {hasSalvo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                <Check className="h-3 w-3" aria-hidden="true" />
                Salvo
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Amanhã
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <FlagIcon
              codigoFifa={partida.mandante.codigo}
              nome={partida.mandante.nome}
              tamanho="md"
            />
            <span className="max-w-20 truncate text-center text-xs font-medium text-foreground">
              {partida.mandante.nome}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
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
              type="text"
              inputMode="numeric"
              maxLength={2}
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
            <span className="max-w-20 truncate text-center text-xs font-medium text-foreground">
              {partida.visitante.nome}
            </span>
          </div>
        </div>

        {ehMataMata && empate && (
          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              {labelQuemAvanca}
            </span>
            <select
              aria-label={labelQuemAvanca}
              value={vencedorAvanca ?? ""}
              disabled={disabled}
              onChange={(e) => onChangeVencedorAvanca(e.target.value || null)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Escolha quem passa</option>
              <option value={partida.mandante.id}>{partida.mandante.nome}</option>
              <option value={partida.visitante.id}>{partida.visitante.nome}</option>
            </select>
          </label>
        )}

        <p className="mt-3 text-center text-xs text-amber-700">
          {hasSalvo
            ? "Palpite salvo · ajuste até o jogo começar"
            : hasPendente
              ? "Toque em Salvar para confirmar este palpite"
              : "Palpite antecipado · você já pode deixar pronto"}
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
          <span className="rounded-full bg-sky-700 px-2 py-0.5 text-[11px] font-medium text-white">
            {horarioDisplay}
          </span>
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
          <span className="max-w-20 truncate text-center text-xs font-medium text-foreground">
            {partida.mandante.nome}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
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
            type="text"
            inputMode="numeric"
            maxLength={2}
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
          <span className="max-w-20 truncate text-center text-xs font-medium text-foreground">
            {partida.visitante.nome}
          </span>
        </div>
      </div>

      {ehMataMata && empate && (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            {labelQuemAvanca}
          </span>
          <select
            aria-label={labelQuemAvanca}
            value={vencedorAvanca ?? ""}
            disabled={disabled}
            onChange={(e) => onChangeVencedorAvanca(e.target.value || null)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Escolha quem passa</option>
            <option value={partida.mandante.id}>{partida.mandante.nome}</option>
            <option value={partida.visitante.id}>{partida.visitante.nome}</option>
          </select>
        </label>
      )}
    </article>
  );
}
