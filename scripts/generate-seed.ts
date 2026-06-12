/**
 * Gera supabase/seed.sql a partir do dataset público openfootball/worldcup.json.
 * Uso: pnpm seed:generate
 *
 * A fonte é o branch `master` do openfootball — reexecutar pode trazer correções
 * do upstream (datas/confrontos). Isso é intencional: o seed reflete o dataset atual.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseKickoffToUtc,
  roundToFase,
  roundToRodada,
  parseGroup,
  isPlaceholderTeam,
  fifaCode,
} from "./lib/transform";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

interface SourceMatch {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
}

function sqlStr(value: string | null): string {
  if (value === null) return "null";
  return `'${value.replace(/'/g, "''")}'`;
}

/** Lado do confronto: ou FK por código FIFA, ou rótulo de exibição. */
function side(team: string): { idExpr: string; label: string | null } {
  if (isPlaceholderTeam(team)) {
    return { idExpr: "null", label: team };
  }
  return {
    idExpr: `(select id from selecoes where codigo = ${sqlStr(fifaCode(team))})`,
    label: null,
  };
}

async function main(): Promise<void> {
  const res = await fetch(SOURCE_URL, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Falha ao baixar fixture (HTTP ${res.status})`);
  const data = (await res.json()) as { matches: SourceMatch[] };
  if (!Array.isArray(data.matches)) {
    throw new Error("Formato do JSON inesperado: campo 'matches' ausente");
  }

  // Seleções reais distintas (ignora placeholders).
  const teams = new Map<string, string>(); // código → nome
  for (const m of data.matches) {
    for (const team of [m.team1, m.team2]) {
      if (!isPlaceholderTeam(team)) teams.set(fifaCode(team), team);
    }
  }

  // Calcula o maior número de Matchday da fase de grupos para servir de base
  // ao offset das rodadas do mata-mata (ex.: se max = 3, Round of 32 → 4).
  let maxGroupMatchday = 0;
  for (const m of data.matches) {
    if (m.round.startsWith("Matchday ")) {
      const n = parseInt(m.round.slice("Matchday ".length), 10);
      if (Number.isFinite(n) && n > maxGroupMatchday) maxGroupMatchday = n;
    }
  }
  if (maxGroupMatchday === 0) {
    throw new Error("Nenhum 'Matchday N' encontrado no JSON — verifique a fonte");
  }

  const lines: string[] = [];
  lines.push("-- GERADO por scripts/generate-seed.ts — NÃO editar à mão.");
  lines.push("-- Fonte: openfootball/worldcup.json (2026). Reexecute com `pnpm seed:generate`.");
  lines.push("");
  lines.push("truncate table public.palpites, public.partidas, public.selecoes cascade;");
  lines.push("");

  const selecaoValues = [...teams.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([codigo, nome]) => `  (${sqlStr(nome)}, ${sqlStr(codigo)})`);
  lines.push("insert into public.selecoes (nome, codigo) values");
  lines.push(selecaoValues.join(",\n") + ";");
  lines.push("");

  lines.push(
    "insert into public.partidas (fase, grupo, rodada, data_hora, estadio, status, mandante_id, visitante_id, mandante_label, visitante_label) values"
  );
  const partidaValues = data.matches.map((m) => {
    const mandante = side(m.team1);
    const visitante = side(m.team2);
    const rodada = roundToRodada(m.round, maxGroupMatchday);
    return (
      `  (${sqlStr(roundToFase(m.round))}, ${sqlStr(parseGroup(m.group))}, ${rodada}, ` +
      `${sqlStr(parseKickoffToUtc(m.date, m.time))}, ${sqlStr(m.ground)}, 'agendada', ` +
      `${mandante.idExpr}, ${visitante.idExpr}, ${sqlStr(mandante.label)}, ${sqlStr(visitante.label)})`
    );
  });
  lines.push(partidaValues.join(",\n") + ";");
  lines.push("");

  const outPath = resolve(process.cwd(), "supabase/seed.sql");
  writeFileSync(outPath, lines.join("\n"), "utf8");
  process.stdout.write(
    `OK: ${teams.size} seleções, ${data.matches.length} partidas → supabase/seed.sql\n`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
