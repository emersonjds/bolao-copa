/**
 * Fixtures no formato CRU do banco (snake_case + joins), como o Supabase
 * devolveria pela REST/RPC. Os fetchers fazem o map para o domínio camelCase,
 * então os testes de integração comparam a saída mapeada contra esses dados.
 */

export const selecaoMexicoDb = { id: "sel-mex", nome: "Mexico", codigo: "MEX" };
export const selecaoAfricaDb = { id: "sel-rsa", nome: "South Africa", codigo: "RSA" };

/** Linha de partida como a query de partidas-fetcher retorna (com joins). */
export const partidaDb = {
  id: "part-1",
  fase: "grupos",
  grupo: "A",
  data_hora: "2026-06-11T19:00:00.000Z",
  estadio: "Mexico City",
  status: "agendada",
  mandante_id: "sel-mex",
  mandante_label: null,
  visitante_id: "sel-rsa",
  visitante_label: null,
  gols_mandante: null,
  gols_visitante: null,
  vencedor_penaltis: null,
  mandante: selecaoMexicoDb,
  visitante: selecaoAfricaDb,
};

/** Partida de mata-mata com confronto ainda indefinido (sem seleções). */
export const partidaIndefinidaDb = {
  ...partidaDb,
  id: "part-ko",
  fase: "oitavas",
  grupo: null,
  mandante_id: null,
  mandante_label: "1A",
  visitante_id: null,
  visitante_label: "2B",
  mandante: null,
  visitante: null,
};

export const palpiteDb = {
  id: "palpite-1",
  participante_id: "part-id-1",
  partida_id: "part-1",
  gols_mandante: 2,
  gols_visitante: 0,
  pontos: null,
};

export const itemRankingRpc = {
  participante_id: "part-id-1",
  nome: "Tester",
  avatar_url: null,
  pontos_totais: 12,
  jogos_pontuados: 4,
};

export const destaqueRodadaRpc = {
  rodada: 1,
  participante_id: "part-id-1",
  nome: "Tester",
  avatar_url: null,
  pontos_rodada: 8,
};
