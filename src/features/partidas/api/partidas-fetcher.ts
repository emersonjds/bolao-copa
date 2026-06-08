import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { nomeSelecaoPt } from "@/shared/lib/selecao-nomes-pt";
import type { FaseCopa, Partida, Selecao, StatusPartida } from "@/entities/partida";

interface SelecaoDb {
  id: string;
  nome: string;
  codigo: string;
}

interface PartidaDb {
  id: string;
  fase: string;
  grupo: string | null;
  data_hora: string;
  janela_inicio: string;
  estadio: string;
  status: string;
  mandante_id: string | null;
  mandante_label: string | null;
  visitante_id: string | null;
  visitante_label: string | null;
  gols_mandante: number | null;
  gols_visitante: number | null;
  vencedor_penaltis: string | null;
  /** Join em selecoes pelo FK mandante_id (null quando ainda indefinido no mata-mata). */
  mandante: SelecaoDb | null;
  /** Join em selecoes pelo FK visitante_id (null quando ainda indefinido no mata-mata). */
  visitante: SelecaoDb | null;
}

/**
 * Constrói um Selecao a partir da linha do banco.
 * Quando a seleção real é null (mata-mata com time indefinido), usa o rótulo
 * de exibição (ex.: "2A", "Vencedor Grupo A") para manter o contrato do tipo.
 */
function mapSelecao(db: SelecaoDb | null, label: string | null): Selecao {
  if (db !== null) {
    // O banco guarda o nome em inglês (dataset openfootball); traduz pelo
    // código FIFA para exibir em PT-BR, com fallback no nome original.
    return { id: db.id, nome: nomeSelecaoPt(db.codigo, db.nome), codigo: db.codigo };
  }
  // Placeholder: código usa até 3 caracteres do rótulo para exibição compacta
  const rotulo = label ?? "?";
  return {
    id: "",
    nome: rotulo,
    codigo: rotulo.slice(0, 3).toUpperCase(),
  };
}

function mapPartida(db: PartidaDb): Partida {
  return {
    id: db.id,
    fase: db.fase as FaseCopa,
    grupo: db.grupo,
    dataHora: db.data_hora,
    janelaInicio: db.janela_inicio,
    estadio: db.estadio,
    status: db.status as StatusPartida,
    mandante: mapSelecao(db.mandante, db.mandante_label),
    visitante: mapSelecao(db.visitante, db.visitante_label),
    golsMandante: db.gols_mandante,
    golsVisitante: db.gols_visitante,
    vencedorPenaltis: db.vencedor_penaltis,
    mandanteLabel: db.mandante_label,
    visitanteLabel: db.visitante_label,
  };
}

/**
 * Lê todas as partidas do Supabase com join nas seleções (mandante/visitante),
 * ordenadas por data_hora ascendente.
 *
 * A autenticação é tratada automaticamente pelo cliente Supabase (RLS via
 * policy "partidas_select" que libera leitura para authenticated).
 */
export async function listarPartidas(): Promise<Partida[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("partidas")
    .select(
      `
      id,
      fase,
      grupo,
      data_hora,
      janela_inicio,
      estadio,
      status,
      mandante_id,
      mandante_label,
      visitante_id,
      visitante_label,
      gols_mandante,
      gols_visitante,
      vencedor_penaltis,
      mandante:selecoes!mandante_id (id, nome, codigo),
      visitante:selecoes!visitante_id (id, nome, codigo)
    `
    )
    .order("data_hora", { ascending: true });

  if (error) {
    throw new Error(`Falha ao carregar partidas: ${error.message}`);
  }

  // Supabase retorna Record<string, unknown>[] sem o Database generic;
  // o cast é seguro porque controlamos o schema e os campos selecionados.
  return (data as unknown as PartidaDb[]).map(mapPartida);
}
