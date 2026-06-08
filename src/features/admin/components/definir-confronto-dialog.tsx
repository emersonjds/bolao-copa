"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useSelecoes } from "../api/selecoes";
import { useDefinirConfronto } from "../api/mutations";
import type { Partida } from "@/entities/partida";

interface Props {
  partida: Partida;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FASE_LABEL: Record<string, string> = {
  grupos: "Fase de Grupos",
  "trinta-e-dois": "Rodada de 32",
  oitavas: "Oitavas de Final",
  quartas: "Quartas de Final",
  semifinal: "Semifinal",
  "terceiro-lugar": "Terceiro Lugar",
  final: "Final",
};

const DATA_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Diálogo de bottom sheet (mobile) / modal centrado (desktop) para definir o confronto de mata-mata. */
export function DefinirConfrontoDialog({ partida, open, onOpenChange }: Props) {
  const { data: selecoes, isLoading: loadingSelecoes } = useSelecoes();
  const mutation = useDefinirConfronto();

  const [mandanteId, setMandanteId] = useState("");
  const [visitanteId, setVisitanteId] = useState("");

  const faseLabel = FASE_LABEL[partida.fase] ?? partida.fase;
  const dataLabel = DATA_FORMATTER.format(new Date(partida.dataHora));

  function handleConfirmar() {
    if (!mandanteId || !visitanteId) return;
    if (mandanteId === visitanteId) return;

    mutation.mutate(
      { partidaId: partida.id, mandanteId, visitanteId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setMandanteId("");
          setVisitanteId("");
        },
      }
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />

        <Dialog.Content
          aria-describedby="confronto-desc"
          className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-card p-6 shadow-xl focus:outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        >
          <div
            className="mx-auto mb-4 h-1 w-10 rounded-full bg-border sm:hidden"
            aria-hidden="true"
          />

          <div className="flex items-start justify-between gap-2">
            <div>
              <Dialog.Title className="font-display text-lg font-bold text-foreground">
                Definir confronto
              </Dialog.Title>
              <Dialog.Description
                id="confronto-desc"
                className="mt-0.5 text-sm text-muted-foreground"
              >
                {faseLabel} · {dataLabel}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Fechar diálogo"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="select-mandante" className="text-sm font-medium text-foreground">
                Mandante (casa)
              </label>
              <select
                id="select-mandante"
                value={mandanteId}
                onChange={(e) => setMandanteId(e.target.value)}
                disabled={loadingSelecoes || mutation.isPending}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecionar time...</option>
                {(selecoes ?? []).map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === visitanteId}>
                    {s.nome} ({s.codigo})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="select-visitante" className="text-sm font-medium text-foreground">
                Visitante (fora)
              </label>
              <select
                id="select-visitante"
                value={visitanteId}
                onChange={(e) => setVisitanteId(e.target.value)}
                disabled={loadingSelecoes || mutation.isPending}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Selecionar time...</option>
                {(selecoes ?? []).map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === mandanteId}>
                    {s.nome} ({s.codigo})
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={
                  !mandanteId || !visitanteId || mandanteId === visitanteId || mutation.isPending
                }
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-brand-800 text-sm font-semibold text-white transition-colors hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden="true"
                    />
                    Confirmando...
                  </span>
                ) : (
                  "Confirmar confronto"
                )}
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex h-10 w-full items-center justify-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Cancelar
                </button>
              </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
