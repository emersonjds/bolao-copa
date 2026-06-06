import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { BOLAO_PADRAO_ID } from "@/shared/lib/constants";
import type { Palpite } from "@/entities/palpite";

// ---------------------------------------------------------------------------
// Tipos internos — formato bruto do banco (snake_case)
// ---------------------------------------------------------------------------

interface PalpiteDb {
  id: string;
  participante_id: string;
  partida_id: string;
  gols_mandante: number;
  gols_visitante: number;
  pontos: number | null;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

function mapPalpite(db: PalpiteDb): Palpite {
  return {
    id: db.id,
    participanteId: db.participante_id,
    partidaId: db.partida_id,
    golsMandante: db.gols_mandante,
    golsVisitante: db.gols_visitante,
    pontos: db.pontos,
  };
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/**
 * Busca o participante_id do usuário no bolão padrão.
 *
 * A relação user_id → participante_id é 1:1 dentro do bolão único desta Copa.
 * O resultado deve ser cacheado com staleTime: Infinity no React Query.
 */
export async function buscarParticipanteId(userId: string): Promise<string> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("participantes")
    .select("id")
    .eq("user_id", userId)
    .eq("bolao_id", BOLAO_PADRAO_ID)
    .single();

  if (error) {
    throw new Error(`Participante não encontrado no bolão padrão: ${error.message}`);
  }

  return (data as { id: string }).id;
}

/**
 * Retorna todos os palpites de um participante.
 * A RLS "palpites_select" garante que só chegam os palpites do próprio usuário
 * (ou os de partidas já iniciadas — anti-cola). O filtro por participante_id
 * é adicionado explicitamente para evitar vazar palpites de outros caso a
 * partida tenha começado.
 */
export async function listarMeusPalpites(participanteId: string): Promise<Palpite[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("palpites")
    .select("id, participante_id, partida_id, gols_mandante, gols_visitante, pontos")
    .eq("participante_id", participanteId);

  if (error) {
    throw new Error(`Falha ao carregar palpites: ${error.message}`);
  }

  return (data as unknown as PalpiteDb[]).map(mapPalpite);
}

// ---------------------------------------------------------------------------
// Mutação
// ---------------------------------------------------------------------------

export interface SalvarPalpiteInput {
  participanteId: string;
  partidaId: string;
  golsMandante: number;
  golsVisitante: number;
}

/**
 * Cria ou atualiza um palpite via upsert.
 *
 * Estratégia de colunas:
 *   INSERT grant: participante_id, partida_id, gols_mandante, gols_visitante
 *   UPDATE grant: participante_id, partida_id, gols_mandante, gols_visitante, updated_at
 *
 * ATENÇÃO: no upsert, o PostgREST inclui TODAS as colunas do payload no SET do
 * ON CONFLICT DO UPDATE — INCLUSIVE participante_id e partida_id (ele NÃO exclui
 * as colunas de conflito). Por isso o UPDATE grant precisa cobrir essas duas
 * colunas também (migration 0011); senão editar um palpite existente falha com
 * 42501. A integridade é garantida pela policy palpites_update_own (WITH CHECK):
 * a linha resultante tem de continuar sendo do próprio usuário. `pontos` nunca
 * entra no payload e fica fora de qualquer grant de escrita.
 *
 * A trava de horário (trg_palpite_lock) roda no servidor; se a partida já
 * tiver começado, o banco lança exceção e o erro é propagado pela mutation.
 */
export async function salvarPalpite(input: SalvarPalpiteInput): Promise<void> {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.from("palpites").upsert(
    {
      participante_id: input.participanteId,
      partida_id: input.partidaId,
      gols_mandante: input.golsMandante,
      gols_visitante: input.golsVisitante,
    },
    { onConflict: "participante_id,partida_id" }
  );

  if (error) {
    // Mensagens possíveis: "Palpite encerrado: a partida já começou" (trigger),
    // erros de RLS, problemas de rede.
    throw new Error(`Falha ao salvar palpite: ${error.message}`);
  }
}
