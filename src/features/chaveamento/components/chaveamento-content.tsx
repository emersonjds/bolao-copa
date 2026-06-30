"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { derivarBracket } from "../lib/derivar-bracket";
import { buscarPartidasMataMata } from "../api/bracket-fetcher";
import { ColunaFase } from "./coluna-fase";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.25;

export function ChaveamentoContent() {
  const [zoom, setZoom] = useState(1);

  const { data: partidas, isLoading, isError } = useQuery({
    queryKey: ["chaveamento"],
    queryFn: buscarPartidasMataMata,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Carregando chaveamento…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center text-sm text-destructive">
        Não foi possível carregar o chaveamento. Tente novamente.
      </div>
    );
  }

  const rodadas = derivarBracket(partidas ?? []);

  if (rodadas.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        O chaveamento ainda não foi definido.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Zoom</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Diminuir zoom"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground disabled:opacity-40"
        >
          −
        </button>
        <span className="min-w-[3ch] text-center font-mono text-xs text-muted-foreground">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Aumentar zoom"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-sm font-bold text-foreground disabled:opacity-40"
        >
          +
        </button>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-background">
        {/* ponytail: transform não altera layout — overflow pode não estender em zoom>1; CSS zoom seria mais correto mas spec pede transform */}
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
          className="flex items-start gap-2 p-4"
        >
          {rodadas.map((rodada, i) => (
            <div key={rodada.fase} className="flex items-center">
              <ColunaFase rodada={rodada} />
              {i < rodadas.length - 1 && (
                <div
                  className="mx-1 h-0.5 w-3 self-center bg-border/50"
                  aria-hidden="true"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
