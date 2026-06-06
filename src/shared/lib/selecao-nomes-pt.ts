/**
 * Nome da seleção em português brasileiro, indexado pelo código FIFA-3.
 *
 * Os dados de partidas vêm do Supabase com nomes em inglês (dataset
 * openfootball). Para manter a UI 100% em PT-BR sem reprocessar o banco,
 * traduzimos pelo código FIFA — estável e independente da grafia em inglês.
 */
export const NOMES_SELECAO_PT: Record<string, string> = {
  MEX: "México",
  RSA: "África do Sul",
  KOR: "Coreia do Sul",
  CZE: "República Tcheca",
  CAN: "Canadá",
  USA: "Estados Unidos",
  BRA: "Brasil",
  ARG: "Argentina",
  FRA: "França",
  ENG: "Inglaterra",
  ESP: "Espanha",
  GER: "Alemanha",
  POR: "Portugal",
  NED: "Países Baixos",
  BEL: "Bélgica",
  CRO: "Croácia",
  URU: "Uruguai",
  COL: "Colômbia",
  ECU: "Equador",
  PAR: "Paraguai",
  MAR: "Marrocos",
  SEN: "Senegal",
  EGY: "Egito",
  ALG: "Argélia",
  TUN: "Tunísia",
  GHA: "Gana",
  CIV: "Costa do Marfim",
  CPV: "Cabo Verde",
  COD: "RD Congo",
  JPN: "Japão",
  IRN: "Irã",
  IRQ: "Iraque",
  KSA: "Arábia Saudita",
  QAT: "Catar",
  JOR: "Jordânia",
  UZB: "Uzbequistão",
  AUS: "Austrália",
  NZL: "Nova Zelândia",
  SUI: "Suíça",
  AUT: "Áustria",
  NOR: "Noruega",
  SWE: "Suécia",
  SCO: "Escócia",
  TUR: "Turquia",
  PAN: "Panamá",
  HAI: "Haiti",
  CUW: "Curaçao",
  BIH: "Bósnia e Herzegovina",
};

/**
 * Devolve o nome da seleção em PT-BR a partir do código FIFA.
 * Em código desconhecido, mantém o `fallback` (nome original do banco).
 */
export function nomeSelecaoPt(codigo: string | null | undefined, fallback: string): string {
  if (!codigo) return fallback;
  return NOMES_SELECAO_PT[codigo.toUpperCase()] ?? fallback;
}
