// Topologia oficial do bracket FIFA 2026 (jogos 73–104).
// Verificado contra: https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage
// Ordem dos jogos espelha supabase/seed.sql (linhas 129–160).

export type FaseMataMata =
  | "trinta-e-dois"
  | "oitavas"
  | "quartas"
  | "semifinal"
  | "terceiro-lugar"
  | "final";

export interface PartidaBracket {
  numero: number;
  fase: FaseMataMata;
  mandanteLabel: string;
  visitanteLabel: string;
}

export const BRACKET_2026: readonly PartidaBracket[] = [
  // 32-avos (73–88)
  { numero: 73, fase: "trinta-e-dois", mandanteLabel: "2A", visitanteLabel: "2B" },
  { numero: 74, fase: "trinta-e-dois", mandanteLabel: "1E", visitanteLabel: "3A/B/C/D/F" },
  { numero: 75, fase: "trinta-e-dois", mandanteLabel: "1F", visitanteLabel: "2C" },
  { numero: 76, fase: "trinta-e-dois", mandanteLabel: "1C", visitanteLabel: "2F" },
  { numero: 77, fase: "trinta-e-dois", mandanteLabel: "1I", visitanteLabel: "3C/D/F/G/H" },
  { numero: 78, fase: "trinta-e-dois", mandanteLabel: "2E", visitanteLabel: "2I" },
  { numero: 79, fase: "trinta-e-dois", mandanteLabel: "1A", visitanteLabel: "3C/E/F/H/I" },
  { numero: 80, fase: "trinta-e-dois", mandanteLabel: "1L", visitanteLabel: "3E/H/I/J/K" },
  { numero: 81, fase: "trinta-e-dois", mandanteLabel: "1D", visitanteLabel: "3B/E/F/I/J" },
  { numero: 82, fase: "trinta-e-dois", mandanteLabel: "1G", visitanteLabel: "3A/E/H/I/J" },
  { numero: 83, fase: "trinta-e-dois", mandanteLabel: "2K", visitanteLabel: "2L" },
  { numero: 84, fase: "trinta-e-dois", mandanteLabel: "1H", visitanteLabel: "2J" },
  { numero: 85, fase: "trinta-e-dois", mandanteLabel: "1B", visitanteLabel: "3E/F/G/I/J" },
  { numero: 86, fase: "trinta-e-dois", mandanteLabel: "1J", visitanteLabel: "2H" },
  { numero: 87, fase: "trinta-e-dois", mandanteLabel: "1K", visitanteLabel: "3D/E/I/J/L" },
  { numero: 88, fase: "trinta-e-dois", mandanteLabel: "2D", visitanteLabel: "2G" },
  // Oitavas (89–96)
  { numero: 89, fase: "oitavas", mandanteLabel: "W74", visitanteLabel: "W77" },
  { numero: 90, fase: "oitavas", mandanteLabel: "W73", visitanteLabel: "W75" },
  { numero: 91, fase: "oitavas", mandanteLabel: "W76", visitanteLabel: "W78" },
  { numero: 92, fase: "oitavas", mandanteLabel: "W79", visitanteLabel: "W80" },
  { numero: 93, fase: "oitavas", mandanteLabel: "W83", visitanteLabel: "W84" },
  { numero: 94, fase: "oitavas", mandanteLabel: "W81", visitanteLabel: "W82" },
  { numero: 95, fase: "oitavas", mandanteLabel: "W86", visitanteLabel: "W88" },
  { numero: 96, fase: "oitavas", mandanteLabel: "W85", visitanteLabel: "W87" },
  // Quartas (97–100)
  { numero: 97, fase: "quartas", mandanteLabel: "W89", visitanteLabel: "W90" },
  { numero: 98, fase: "quartas", mandanteLabel: "W93", visitanteLabel: "W94" },
  { numero: 99, fase: "quartas", mandanteLabel: "W91", visitanteLabel: "W92" },
  { numero: 100, fase: "quartas", mandanteLabel: "W95", visitanteLabel: "W96" },
  // Semis (101–102)
  { numero: 101, fase: "semifinal", mandanteLabel: "W97", visitanteLabel: "W98" },
  { numero: 102, fase: "semifinal", mandanteLabel: "W99", visitanteLabel: "W100" },
  // 3º lugar e final (103–104)
  { numero: 103, fase: "terceiro-lugar", mandanteLabel: "L101", visitanteLabel: "L102" },
  { numero: 104, fase: "final", mandanteLabel: "W101", visitanteLabel: "W102" },
];

const POR_NUMERO = new Map(BRACKET_2026.map((p) => [p.numero, p]));

export function partidaPorNumero(numero: number): PartidaBracket | undefined {
  return POR_NUMERO.get(numero);
}
