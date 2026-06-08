"use client";

import { useEffect } from "react";
import type { Partida } from "@/entities/partida";
import { proximaBorda } from "../lib/estado-palpite";

/**
 * Agenda um timer até a próxima "virada" (abertura de um jogo futuro ou apito de
 * um liberado) e chama onBorda quando ela chega. Faz a tela reagir à meia-noite
 * sem polling. Reagenda quando `partidas` muda.
 */
export function useRefetchNaBorda(partidas: Partida[], onBorda: () => void): void {
  useEffect(() => {
    const agora = Date.now();
    const borda = proximaBorda(partidas, agora);
    if (borda === null) return;
    const delay = Math.max(0, borda - agora);
    const id = setTimeout(onBorda, delay);
    return () => clearTimeout(id);
  }, [partidas, onBorda]);
}
