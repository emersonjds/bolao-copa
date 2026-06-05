import type { Partida } from "@/entities/partida";

/**
 * Jogos de exemplo da fase de grupos. Placeholder até a integração com uma
 * API de fixtures real (ex.: API-Football / football-data.org).
 */
export const partidasFixture: Partida[] = [
  {
    id: "1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T20:00:00Z",
    estadio: "Estadio Azteca, Cidade do México",
    status: "agendada",
    mandante: { id: "mex", nome: "México", codigo: "MEX" },
    visitante: { id: "bra", nome: "Brasil", codigo: "BRA" },
    golsMandante: null,
    golsVisitante: null,
  },
  {
    id: "2",
    fase: "grupos",
    grupo: "B",
    dataHora: "2026-06-12T18:00:00Z",
    estadio: "MetLife Stadium, Nova Jersey",
    status: "agendada",
    mandante: { id: "arg", nome: "Argentina", codigo: "ARG" },
    visitante: { id: "fra", nome: "França", codigo: "FRA" },
    golsMandante: null,
    golsVisitante: null,
  },
  {
    id: "3",
    fase: "grupos",
    grupo: "C",
    dataHora: "2026-06-12T21:00:00Z",
    estadio: "SoFi Stadium, Los Angeles",
    status: "agendada",
    mandante: { id: "esp", nome: "Espanha", codigo: "ESP" },
    visitante: { id: "ger", nome: "Alemanha", codigo: "GER" },
    golsMandante: null,
    golsVisitante: null,
  },
  {
    id: "4",
    fase: "grupos",
    grupo: "D",
    dataHora: "2026-06-13T19:00:00Z",
    estadio: "BMO Field, Toronto",
    status: "agendada",
    mandante: { id: "eng", nome: "Inglaterra", codigo: "ENG" },
    visitante: { id: "por", nome: "Portugal", codigo: "POR" },
    golsMandante: null,
    golsVisitante: null,
  },
];
