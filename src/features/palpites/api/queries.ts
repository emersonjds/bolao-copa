import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseUser } from "@/shared/lib/supabase";
import {
  buscarParticipanteId,
  listarMeusPalpites,
  salvarPalpite,
  type SalvarPalpiteInput,
} from "./palpites-fetcher";

export const palpitesKeys = {
  all: ["palpites"] as const,
  participanteId: (userId: string) => ["participante-id", userId] as const,
  meus: (participanteId: string) => [...palpitesKeys.all, "meus", participanteId] as const,
};

/**
 * Resolve e cacheia o participante_id do usuário atual no bolão padrão.
 * staleTime: Infinity porque participante_id não muda durante a sessão.
 * Privado: não exportado; use useMeusPalpites / useSalvarPalpite.
 */
function useParticipanteAtual() {
  const user = useSupabaseUser();

  return useQuery({
    queryKey: palpitesKeys.participanteId(user?.id ?? ""),
    queryFn: () => buscarParticipanteId(user!.id),
    enabled: !!user,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useMeusPalpites() {
  const { data: participanteId } = useParticipanteAtual();

  return useQuery({
    queryKey: palpitesKeys.meus(participanteId ?? ""),
    queryFn: () => listarMeusPalpites(participanteId!),
    enabled: !!participanteId,
  });
}

export type { SalvarPalpiteInput };

/** Variáveis passadas à mutation — participanteId é resolvido internamente. */
export type SalvarPalpiteVariables = Omit<SalvarPalpiteInput, "participanteId">;

/**
 * Em caso de sucesso invalida a query de palpites do participante atual,
 * forçando refetch. Erros do trigger de trava de horário chegam em `error`
 * com a mensagem do banco (ex.: "Palpite encerrado: a partida já começou").
 */
export function useSalvarPalpite() {
  const { data: participanteId } = useParticipanteAtual();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: SalvarPalpiteVariables) => {
      if (!participanteId) {
        throw new Error("Participante não identificado — faça login primeiro.");
      }
      return salvarPalpite({ participanteId, ...vars });
    },
    onSuccess: () => {
      if (participanteId) {
        void queryClient.invalidateQueries({
          queryKey: palpitesKeys.meus(participanteId),
        });
      }
    },
  });
}
