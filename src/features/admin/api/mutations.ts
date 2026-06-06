"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { StatusPartida } from "@/entities/partida";

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

export interface SalvarResultadoInput {
  partidaId: string;
  golsMandante: number;
  golsVisitante: number;
  /** "encerrada" aciona o trigger de apuração de pontos no banco. */
  status: StatusPartida;
  /** ID da seleção vencedora nos pênaltis — só para exibição, não afeta pontuação. */
  vencedorPenaltis?: string | null;
}

export interface DefinirConfrontoInput {
  partidaId: string;
  mandanteId: string;
  visitanteId: string;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Atualiza placar e status de uma partida.
 * Ao salvar com status "encerrada", o trigger `apurar_pontos` do banco
 * calcula automaticamente os pontos dos palpites.
 *
 * Invalida: ["partidas"], ["ranking"], ["destaque-rodada"] no sucesso.
 */
export function useSalvarResultado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SalvarResultadoInput) => {
      // TODO: API — substituir pelo endpoint REST quando o backend existir
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("partidas")
        .update({
          gols_mandante: input.golsMandante,
          gols_visitante: input.golsVisitante,
          status: input.status,
          vencedor_penaltis: input.vencedorPenaltis ?? null,
        })
        .eq("id", input.partidaId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partidas"] });
      void queryClient.invalidateQueries({ queryKey: ["ranking"] });
      void queryClient.invalidateQueries({ queryKey: ["destaque-rodada"] });
      toast.success("Resultado salvo! Pontos apurados automaticamente.");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar resultado: ${error.message}`);
    },
  });
}

/**
 * Define os times de uma partida de mata-mata cujo confronto ainda não foi
 * determinado (mandante_id / visitante_id nulos no banco).
 *
 * Invalida: ["partidas"] no sucesso.
 */
export function useDefinirConfronto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DefinirConfrontoInput) => {
      // TODO: API — substituir pelo endpoint REST quando o backend existir
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("partidas")
        .update({
          mandante_id: input.mandanteId,
          visitante_id: input.visitanteId,
        })
        .eq("id", input.partidaId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["partidas"] });
      toast.success("Confronto definido com sucesso.");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao definir confronto: ${error.message}`);
    },
  });
}
