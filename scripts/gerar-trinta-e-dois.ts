/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Lê o banco, deriva a classificação dos grupos, resolve os 16 confrontos do
 * trinta-e-dois e (com --sim) grava os IDs de seleção nas partidas do banco.
 *
 * Uso:
 *   pnpm trinta-e-dois               → dry-run (só imprime, sem gravar)
 *   pnpm trinta-e-dois --sim         → grava no local
 *   DATABASE_URL=<pooler> pnpm trinta-e-dois --prod --sim  → grava em prod (pede confirmação)
 */
import { Client } from "pg";
import readline from "node:readline/promises";
import { garantirEnvSupabase } from "./lib/env";
import { derivarClassificacao } from "@/features/grupos";
import { resolverTrintaEDois } from "./lib/resolver-trinta-e-dois";
import { nomeSelecaoPt } from "@/shared/lib/selecao-nomes-pt";
import type { Partida, StatusPartida } from "@/entities/partida";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const ehProd = flags.has("--prod");
const ehSim = flags.has("--sim");

async function confirmarProd(url: string): Promise<void> {
  console.log(`\nATENÇÃO: vai gravar em produção (${url}).`);
  console.log("         Cada partida de trinta-e-dois terá mandante_id/visitante_id sobrescritos.");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const resposta = await rl.question('   Digite "GRAVAR" para continuar: ');
  rl.close();
  if (resposta.trim() !== "GRAVAR") throw new Error("ABORTADO pelo usuário.");
}

async function main() {
  const { url } = garantirEnvSupabase();
  const ehLocal = url.includes("127.0.0.1") || url.includes("localhost");

  if (!ehLocal && !ehProd) {
    throw new Error(`ABORTADO: ${url} não é local. Use --prod para rodar em produção.`);
  }
  if (!ehLocal && !ehSim) {
    throw new Error("ABORTADO: --prod exige --sim explícito. Rode com --prod --sim.");
  }
  if (!ehLocal) await confirmarProd(url);

  const dbUrl =
    process.env.DATABASE_URL ??
    (ehLocal ? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" : null);
  if (!dbUrl) {
    throw new Error(
      "Defina DATABASE_URL (connection string do Postgres de produção — pooler do dashboard)."
    );
  }

  const db = new Client({ connectionString: dbUrl });
  await db.connect();
  try {
    await run(db);
  } finally {
    await db.end();
  }
}

interface GrupoRow {
  id: string;
  grupo: string;
  data_hora: string;
  janela_inicio: string;
  estadio: string;
  status: string;
  mandante_id: string;
  visitante_id: string;
  mandante_label: string | null;
  visitante_label: string | null;
  gols_mandante: number | null;
  gols_visitante: number | null;
  vencedor_penaltis: string | null;
  m_id: string;
  m_nome: string;
  m_codigo: string;
  v_id: string;
  v_nome: string;
  v_codigo: string;
}

interface PartidaLabelRow {
  mandante_label: string;
  visitante_label: string;
  data_hora_fmt: string;
  estadio: string;
}

async function run(db: Client) {
  const { rows } = await db.query<GrupoRow>(`
    SELECT p.id, p.grupo,
           p.data_hora::text AS data_hora,
           p.janela_inicio::text AS janela_inicio,
           p.estadio, p.status,
           p.mandante_id, p.visitante_id,
           p.mandante_label, p.visitante_label,
           p.gols_mandante, p.gols_visitante, p.vencedor_penaltis,
           sm.id   AS m_id,   sm.nome   AS m_nome,   sm.codigo   AS m_codigo,
           sv.id   AS v_id,   sv.nome   AS v_nome,   sv.codigo   AS v_codigo
    FROM partidas p
    JOIN selecoes sm ON sm.id = p.mandante_id
    JOIN selecoes sv ON sv.id = p.visitante_id
    WHERE p.fase = 'grupos'
    ORDER BY p.data_hora
  `);

  const partidas: Partida[] = rows.map((row) => ({
    id: row.id,
    fase: "grupos",
    grupo: row.grupo,
    dataHora: row.data_hora,
    janelaInicio: row.janela_inicio,
    estadio: row.estadio,
    status: row.status as StatusPartida,
    mandante: {
      id: row.m_id,
      nome: nomeSelecaoPt(row.m_codigo, row.m_nome),
      codigo: row.m_codigo,
    },
    visitante: {
      id: row.v_id,
      nome: nomeSelecaoPt(row.v_codigo, row.v_nome),
      codigo: row.v_codigo,
    },
    golsMandante: row.gols_mandante,
    golsVisitante: row.gols_visitante,
    vencedorPenaltis: row.vencedor_penaltis,
    mandanteLabel: row.mandante_label,
    visitanteLabel: row.visitante_label,
  }));

  const classificacao = derivarClassificacao(partidas);

  const naoFinalizados = classificacao.filter((g) => !g.finalizado);
  if (classificacao.length !== 12 || naoFinalizados.length > 0) {
    const pendentes = naoFinalizados.map((g) => g.grupo).join(", ") || "—";
    throw new Error(
      `Não é possível resolver: ${classificacao.length} grupos encontrados, ` +
        `${naoFinalizados.length} não finalizados (grupos: ${pendentes}). ` +
        `Encerre todos os jogos de grupos antes de rodar este comando.`
    );
  }

  // id → nome para exibição dos confrontos
  const nomeMap = new Map<string, string>();
  for (const g of classificacao) {
    for (const linha of g.linhas) {
      nomeMap.set(linha.selecao.id, linha.selecao.nome);
    }
  }

  const confrontos = resolverTrintaEDois(classificacao);

  const { rows: tz32 } = await db.query<PartidaLabelRow>(`
    SELECT mandante_label, visitante_label, estadio,
           to_char(data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS data_hora_fmt
    FROM partidas
    WHERE fase = 'trinta-e-dois'
    ORDER BY data_hora
  `);
  const infoMap = new Map(tz32.map((r) => [`${r.mandante_label}|${r.visitante_label}`, r]));

  // ── relatório ──────────────────────────────────────────────────────────────
  console.log("\n=== Classificação dos Grupos ===");
  for (const grupo of classificacao) {
    const resumo = grupo.linhas
      .slice(0, 3)
      .map((l) => `${l.posicao}º ${l.selecao.nome} (${l.pontos}pts, SG ${l.saldoGols >= 0 ? "+" : ""}${l.saldoGols})`)
      .join("  |  ");
    console.log(`  Grupo ${grupo.grupo}: ${resumo}`);
  }

  console.log("\n=== 16 Confrontos do Trinta e Dois ===");
  for (const c of confrontos) {
    const info = infoMap.get(`${c.mandanteLabel}|${c.visitanteLabel}`);
    const mandanteNome = nomeMap.get(c.mandanteId) ?? "?";
    const visitanteNome = nomeMap.get(c.visitanteId) ?? "?";
    const data = info?.data_hora_fmt ?? "?";
    const estadio = info?.estadio ?? "?";
    console.log(
      `  ${mandanteNome.padEnd(26)} × ${visitanteNome.padEnd(26)}  ${data}  ${estadio}`
    );
  }

  if (!ehSim) {
    console.log("\nDry-run concluído. Rode com --sim para gravar no banco.");
    return;
  }

  let atualizadas = 0;
  for (const c of confrontos) {
    const result = await db.query(
      `UPDATE partidas
       SET mandante_id = $1, visitante_id = $2
       WHERE fase = 'trinta-e-dois' AND mandante_label = $3 AND visitante_label = $4`,
      [c.mandanteId, c.visitanteId, c.mandanteLabel, c.visitanteLabel]
    );
    atualizadas += result.rowCount ?? 0;
  }
  console.log(`\n${atualizadas} partidas atualizadas.`);
}

main().catch((erro: Error) => {
  console.error("ERRO:", erro.message);
  process.exit(1);
});
