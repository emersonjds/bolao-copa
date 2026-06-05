"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { FlagIcon } from "@/shared/ui/flag-icon";
import type { FaseCopa, Partida, StatusPartida } from "@/entities/partida";
import { useSalvarResultado } from "../api/mutations";
import { DefinirConfrontoDialog } from "./definir-confronto-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FASE_LABEL: Record<FaseCopa, string> = {
  grupos: "Fase de Grupos",
  "trinta-e-dois": "Rodada de 32",
  oitavas: "Oitavas de Final",
  quartas: "Quartas de Final",
  semifinal: "Semifinal",
  "terceiro-lugar": "Terceiro Lugar",
  final: "Final",
};

const STATUS_LABEL: Record<StatusPartida, string> = {
  agendada: "Agendado",
  "ao-vivo": "Ao vivo",
  encerrada: "Encerrado",
};

const STATUS_STYLE: Record<StatusPartida, string> = {
  agendada: "bg-muted text-muted-foreground",
  "ao-vivo": "bg-destructive/10 text-destructive",
  encerrada: "bg-brand-100 text-brand-700",
};

const FASES_MATA_MATA: ReadonlySet<FaseCopa> = new Set([
  "trinta-e-dois",
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
]);

const DATE_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDataHora(dataHora: string): string {
  const date = new Date(dataHora);
  const datePart = DATE_FORMATTER.format(date);
  const timePart = TIME_FORMATTER.format(date).replace(":", "h");
  return `${datePart} · ${timePart}`;
}

function formatGrupoOuFase(partida: Partida): string {
  return partida.grupo ? `Grupo ${partida.grupo}` : FASE_LABEL[partida.fase];
}

// ---------------------------------------------------------------------------
// StatusPill interno
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: StatusPartida }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${STATUS_STYLE[status]}`}
    >
      {status === "ao-vivo" && (
        <span
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive"
          aria-hidden="true"
        />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CardEdicao — partida com times definidos (agendada / ao-vivo / editando encerrada)
// ---------------------------------------------------------------------------

interface CardEdicaoProps {
  partida: Partida;
  onCancelar?: () => void;
}

function CardEdicao({ partida, onCancelar }: CardEdicaoProps) {
  const mutation = useSalvarResultado();

  const [golsMandante, setGolsMandante] = useState(
    partida.golsMandante !== null ? String(partida.golsMandante) : ""
  );
  const [golsVisitante, setGolsVisitante] = useState(
    partida.golsVisitante !== null ? String(partida.golsVisitante) : ""
  );
  const [encerrada, setEncerrada] = useState(partida.status === "encerrada");
  const [vencedorPenaltis, setVencedorPenaltis] = useState<string | null>(
    partida.vencedorPenaltis ?? null
  );

  const isMataMata = FASES_MATA_MATA.has(partida.fase);
  const golsMandanteNum = parseInt(golsMandante, 10);
  const golsVisitanteNum = parseInt(golsVisitante, 10);
  const placaresDefined = !isNaN(golsMandanteNum) && !isNaN(golsVisitanteNum);
  const empate = placaresDefined && golsMandanteNum === golsVisitanteNum;
  const mostrarPenaltis = isMataMata && encerrada && empate;

  const statusParaSalvar: StatusPartida = encerrada ? "encerrada" : "agendada";

  function handleSalvar() {
    if (!placaresDefined) return;

    mutation.mutate(
      {
        partidaId: partida.id,
        golsMandante: golsMandanteNum,
        golsVisitante: golsVisitanteNum,
        status: statusParaSalvar,
        vencedorPenaltis: mostrarPenaltis ? vencedorPenaltis : null,
      },
      {
        onSuccess: () => {
          if (onCancelar) onCancelar(); // fecha modo edição para encerradas
        },
      }
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground">
            {formatDataHora(partida.dataHora)} · {formatGrupoOuFase(partida)}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {partida.mandante.nome} × {partida.visitante.nome}
          </p>
        </div>
        <StatusPill status={partida.status} />
      </div>

      {/* Confronto com inputs */}
      <div className="flex items-center gap-2">
        {/* Mandante */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FlagIcon
            codigoFifa={partida.mandante.codigo}
            nome={partida.mandante.nome}
            tamanho="sm"
          />
          <span className="truncate text-sm font-medium text-foreground">
            {partida.mandante.nome}
          </span>
        </div>

        {/* Inputs de placar */}
        <div className="flex shrink-0 items-center gap-1.5">
          <label className="sr-only" htmlFor={`gols-mandante-${partida.id}`}>
            Gols de {partida.mandante.nome}
          </label>
          <input
            id={`gols-mandante-${partida.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            placeholder="–"
            value={golsMandante}
            onChange={(e) => setGolsMandante(e.target.value)}
            disabled={mutation.isPending}
            className="h-11 w-12 rounded-xl border border-input bg-background text-center font-mono text-lg font-bold text-foreground focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="font-mono text-lg font-bold text-muted-foreground" aria-hidden="true">
            ×
          </span>
          <label className="sr-only" htmlFor={`gols-visitante-${partida.id}`}>
            Gols de {partida.visitante.nome}
          </label>
          <input
            id={`gols-visitante-${partida.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            placeholder="–"
            value={golsVisitante}
            onChange={(e) => setGolsVisitante(e.target.value)}
            disabled={mutation.isPending}
            className="h-11 w-12 rounded-xl border border-input bg-background text-center font-mono text-lg font-bold text-foreground focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Visitante */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-medium text-foreground">
            {partida.visitante.nome}
          </span>
          <FlagIcon
            codigoFifa={partida.visitante.codigo}
            nome={partida.visitante.nome}
            tamanho="sm"
          />
        </div>
      </div>

      {/* Checkbox "Marcar como encerrada" */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={encerrada}
          onChange={(e) => setEncerrada(e.target.checked)}
          disabled={mutation.isPending}
          className="h-5 w-5 rounded border-border accent-brand-800 disabled:cursor-not-allowed"
        />
        <span className="text-sm font-medium text-foreground">Marcar como encerrada</span>
      </label>

      {/* Campo de pênaltis — só mata-mata + encerrada + empate */}
      {mostrarPenaltis && (
        <fieldset className="space-y-2 rounded-xl bg-muted/50 p-3">
          <legend className="text-xs font-semibold text-muted-foreground">
            Vencedor nos pênaltis (só para exibição)
          </legend>
          <div className="flex gap-4">
            {[partida.mandante, partida.visitante].map((selecao) => (
              <label
                key={selecao.id}
                className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-foreground"
              >
                <input
                  type="radio"
                  name={`penaltis-${partida.id}`}
                  value={selecao.id}
                  checked={vencedorPenaltis === selecao.id}
                  onChange={() => setVencedorPenaltis(selecao.id)}
                  disabled={mutation.isPending}
                  className="accent-brand-800 disabled:cursor-not-allowed"
                />
                {selecao.nome}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Botão salvar + cancelar (edição de encerrada) */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSalvar}
          disabled={!placaresDefined || mutation.isPending}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-800 text-sm font-semibold text-white transition-colors hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2">
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden="true"
              />
              Salvando...
            </span>
          ) : (
            "Salvar resultado"
          )}
        </button>

        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            disabled={mutation.isPending}
            className="flex h-10 w-full items-center justify-center text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardCompacto — partida encerrada (modo leitura com botão de edição)
// ---------------------------------------------------------------------------

interface CardCompactoProps {
  partida: Partida;
  onEditar: () => void;
}

function CardCompacto({ partida, onEditar }: CardCompactoProps) {
  const placar =
    partida.golsMandante !== null && partida.golsVisitante !== null
      ? `${partida.mandante.nome} ${partida.golsMandante} × ${partida.golsVisitante} ${partida.visitante.nome}`
      : `${partida.mandante.nome} × ${partida.visitante.nome}`;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-1 flex-col">
        <p className="text-xs text-muted-foreground">
          {DATE_FORMATTER.format(new Date(partida.dataHora))} · {formatGrupoOuFase(partida)}
        </p>
        <p className="text-sm font-semibold text-foreground">{placar}</p>
      </div>
      <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
        Encerrada
      </span>
      <button
        type="button"
        onClick={onEditar}
        aria-label={`Editar resultado de ${partida.mandante.nome} × ${partida.visitante.nome}`}
        title={`Editar resultado de ${partida.mandante.nome} × ${partida.visitante.nome}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CardConfronto — mata-mata com times ainda indefinidos
// ---------------------------------------------------------------------------

interface CardConfrontoProps {
  partida: Partida;
}

function CardConfronto({ partida }: CardConfrontoProps) {
  const [dialogAberto, setDialogAberto] = useState(false);

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {FASE_LABEL[partida.fase]} · {formatDataHora(partida.dataHora)}
          </p>
          <StatusPill status={partida.status} />
        </div>

        {/* Times placeholder */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <div
              className="h-8 w-8 rounded-full border border-dashed border-border bg-muted"
              aria-hidden="true"
            />
            <p className="max-w-[90px] text-xs text-muted-foreground">
              {partida.mandanteLabel ?? "A definir"}
            </p>
          </div>
          <span className="font-mono text-muted-foreground" aria-hidden="true">
            ×
          </span>
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <div
              className="h-8 w-8 rounded-full border border-dashed border-border bg-muted"
              aria-hidden="true"
            />
            <p className="max-w-[90px] text-xs text-muted-foreground">
              {partida.visitanteLabel ?? "A definir"}
            </p>
          </div>
        </div>

        {/* Botão abrir dialog */}
        <button
          type="button"
          onClick={() => setDialogAberto(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-brand-300 bg-brand-50 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-100"
        >
          Definir confronto
        </button>
      </div>

      <DefinirConfrontoDialog
        partida={partida}
        open={dialogAberto}
        onOpenChange={setDialogAberto}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// CardAdmin — componente público que escolhe o modo correto
// ---------------------------------------------------------------------------

interface CardAdminProps {
  partida: Partida;
}

/**
 * Card de resultado para o painel admin.
 *
 * Modos:
 * - confronto: mata-mata com times ainda indefinidos (mandante.id === "")
 * - compacto: partida encerrada em leitura, com botão de edição
 * - edição: formulário inline com inputs de placar e checkbox de encerramento
 */
export function CardAdmin({ partida }: CardAdminProps) {
  const teamsUndefined = partida.mandante.id === "" || partida.visitante.id === "";

  // isEditing: false → modo compacto (só para encerradas)
  const [isEditing, setIsEditing] = useState(partida.status !== "encerrada");

  if (teamsUndefined) {
    return (
      <li className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <CardConfronto partida={partida} />
      </li>
    );
  }

  if (partida.status === "encerrada" && !isEditing) {
    return (
      <li className="rounded-2xl border border-brand-200 bg-brand-50/50 p-3 shadow-sm">
        <CardCompacto partida={partida} onEditar={() => setIsEditing(true)} />
      </li>
    );
  }

  const isEditing_encerrada = partida.status === "encerrada";

  return (
    <li className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <CardEdicao
        partida={partida}
        onCancelar={isEditing_encerrada ? () => setIsEditing(false) : undefined}
      />
    </li>
  );
}

// ---------------------------------------------------------------------------
// CardAdmin skeleton (estado de carregamento)
// ---------------------------------------------------------------------------

export function CardAdminSkeleton() {
  return (
    <li
      className="h-32 animate-pulse rounded-2xl border border-border bg-card"
      aria-hidden="true"
    />
  );
}
