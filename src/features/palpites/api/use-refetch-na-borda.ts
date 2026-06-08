"use client";

import { useEffect } from "react";
import type { Partida } from "@/entities/partida";
import { proximaBorda } from "../lib/estado-palpite";

// Limite do setTimeout (int 32 bits, ~24,8 dias). Atrasos acima disso estouram
// e o timer dispara IMEDIATAMENTE — o que causaria um loop de refetch. Bordas
// tão distantes não interessam: a tela é reavaliada quando os dados mudarem.
const MAX_DELAY_MS = 2_147_483_647;

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
    if (delay > MAX_DELAY_MS) return; // borda distante: não agenda (evita overflow)
    const id = setTimeout(onBorda, delay);
    return () => clearTimeout(id);
  }, [partidas, onBorda]);
}
