/**
 * Mapeamento FIFA-3 → ISO-2 minúsculo para uso com a lib `flag-icons`.
 * Cobre os 48 países confirmados/prováveis na Copa 2026.
 * Códigos britânicos seguem o formato do flag-icons: gb-eng, gb-sct.
 */
export const FIFA_TO_ISO2: Record<string, string> = {
  ALG: "dz",
  ARG: "ar",
  AUS: "au",
  AUT: "at",
  BEL: "be",
  BIH: "ba",
  BRA: "br",
  CAN: "ca",
  CIV: "ci",
  COD: "cd",
  COL: "co",
  CPV: "cv",
  CRO: "hr",
  CUW: "cw",
  CZE: "cz",
  ECU: "ec",
  EGY: "eg",
  ENG: "gb-eng",
  ESP: "es",
  FRA: "fr",
  GER: "de",
  GHA: "gh",
  HAI: "ht",
  IRN: "ir",
  IRQ: "iq",
  JOR: "jo",
  JPN: "jp",
  KOR: "kr",
  KSA: "sa",
  MAR: "ma",
  MEX: "mx",
  NED: "nl",
  NOR: "no",
  NZL: "nz",
  PAN: "pa",
  PAR: "py",
  POR: "pt",
  QAT: "qa",
  RSA: "za",
  SCO: "gb-sct",
  SEN: "sn",
  SUI: "ch",
  SWE: "se",
  TUN: "tn",
  TUR: "tr",
  URU: "uy",
  USA: "us",
  UZB: "uz",
};

/**
 * Retorna o código ISO-2 (minúsculo) para uso em `fi fi-{iso}`.
 * Busca case-insensitive: "bra", "BRA" e "Bra" retornam "br".
 * Retorna "xx" quando o código FIFA não está no mapa (exibe escudo genérico).
 */
export function getFlagCode(codigoFifa: string): string {
  return FIFA_TO_ISO2[codigoFifa.toUpperCase()] ?? "xx";
}
