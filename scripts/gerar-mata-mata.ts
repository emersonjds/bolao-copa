/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Lê o banco, resolve os confrontos do mata-mata usando o bracket FIFA 2026
 * e (com --sim) grava os IDs de seleção nas partidas do banco.
 *
 * Uso:
 *   pnpm mata-mata               → dry-run (só imprime, sem gravar)
 *   pnpm mata-mata --sim         → grava no local
 *   DATABASE_URL=<pooler> pnpm mata-mata --prod --sim  → grava em prod (pede confirmação)
 */
import { Client } from "pg";
import readline from "node:readline/promises";
import { garantirEnvSupabase } from "./lib/env";
import { BRACKET_2026, type FaseMataMata } from "./lib/bracket-2026";
import { resolverMataMata, type PartidaResultado } from "./lib/resolver-mata-mata";
import { nomeSelecaoPt } from "@/shared/lib/selecao-nomes-pt";
import type { StatusPartida } from "@/entities/partida";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const ehProd = flags.has("--prod");
const ehSim = flags.has("--sim");

async function confirmarProd(url: string): Promise<void> {
  console.log(`\nATENÇÃO: vai gravar em produção (${url}).`);
  console.log("         Cada partida do mata-mata terá mandante_id/visitante_id sobrescritos.");
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

const FASES_MATA_MATA: FaseMataMata[] = [
  "trinta-e-dois",
  "oitavas",
  "quartas",
  "semifinal",
  "terceiro-lugar",
  "final",
];

interface PartidaRow {
  fase: string;
  mandante_id: string | null;
  visitante_id: string | null;
  gols_mandante: number | null;
  gols_visitante: number | null;
  vencedor_penaltis: string | null;
  status: string;
  mandante_label: string;
  visitante_label: string;
  estadio: string;
  data_hora_fmt: string;
  m_codigo: string | null;
  m_nome: string | null;
  v_codigo: string | null;
  v_nome: string | null;
}

// ponytail: Map por (fase|mandante_label|visitante_label) → numero do bracket, build once
const BRACKET_POR_LABEL = new Map(
  BRACKET_2026.map((p) => [`${p.fase}|${p.mandanteLabel}|${p.visitanteLabel}`, p.numero])
);

async function run(db: Client) {
  const { rows } = await db.query<PartidaRow>(
    `SELECT p.fase, p.mandante_id, p.visitante_id,
            p.gols_mandante, p.gols_visitante, p.vencedor_penaltis,
            p.status, p.mandante_label, p.visitante_label,
            p.estadio,
            to_char(p.data_hora AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI') AS data_hora_fmt,
            sm.codigo AS m_codigo, sm.nome AS m_nome,
            sv.codigo AS v_codigo, sv.nome AS v_nome
     FROM partidas p
     LEFT JOIN selecoes sm ON sm.id = p.mandante_id
     LEFT JOIN selecoes sv ON sv.id = p.visitante_id
     WHERE p.fase = ANY($1::text[])
     ORDER BY p.data_hora`,
    [FASES_MATA_MATA]
  );

  const nomeMap = new Map<string, string>();
  const infoMap = new Map<string, PartidaRow>();
  for (const row of rows) {
    if (row.mandante_id && row.m_codigo) {
      nomeMap.set(row.mandante_id, nomeSelecaoPt(row.m_codigo, row.m_nome ?? row.mandante_id));
    }
    if (row.visitante_id && row.v_codigo) {
      nomeMap.set(row.visitante_id, nomeSelecaoPt(row.v_codigo, row.v_nome ?? row.visitante_id));
    }
    infoMap.set(`${row.fase}|${row.mandante_label}|${row.visitante_label}`, row);
  }

  const partidas: PartidaResultado[] = rows.flatMap((row) => {
    const chave = `${row.fase}|${row.mandante_label}|${row.visitante_label}`;
    const numero = BRACKET_POR_LABEL.get(chave);
    if (numero === undefined) {
      console.warn(`  AVISO: partida sem número no bracket: ${chave}`);
      return [];
    }
    return [
      {
        numero,
        fase: row.fase as FaseMataMata,
        mandanteId: row.mandante_id,
        visitanteId: row.visitante_id,
        golsMandante: row.gols_mandante,
        golsVisitante: row.gols_visitante,
        vencedorPenaltis: row.vencedor_penaltis,
        status: row.status as StatusPartida,
      },
    ];
  });

  const confrontos = resolverMataMata(partidas);

  // ── relatório ──────────────────────────────────────────────────────────────
  if (confrontos.length === 0) {
    console.log("\nNenhum confronto resolvível agora.");
  } else {
    console.log(`\n=== ${confrontos.length} Confronto(s) Resolvível(eis) Agora ===`);
    for (const c of confrontos) {
      const info = infoMap.get(`${c.fase}|${c.mandanteLabel}|${c.visitanteLabel}`);
      const mandanteNome = nomeMap.get(c.mandanteId) ?? c.mandanteId;
      const visitanteNome = nomeMap.get(c.visitanteId) ?? c.visitanteId;
      const data = info?.data_hora_fmt ?? "?";
      const estadio = info?.estadio ?? "?";
      console.log(
        `  [${c.fase.padEnd(14)}] ${mandanteNome.padEnd(26)} × ${visitanteNome.padEnd(26)}  ${data}  ${estadio}`
      );
    }
  }

  const resolvidosAgora = new Set(
    confrontos.map((c) => `${c.fase}|${c.mandanteLabel}|${c.visitanteLabel}`)
  );
  const porNumero = new Map(partidas.map((p) => [p.numero, p]));

  const pendentes: Record<string, string[]> = {};
  for (const slot of BRACKET_2026) {
    if (slot.fase === "trinta-e-dois") continue;
    const chaveSlot = `${slot.fase}|${slot.mandanteLabel}|${slot.visitanteLabel}`;
    if (resolvidosAgora.has(chaveSlot)) continue;
    const atual = porNumero.get(slot.numero);
    if (atual?.mandanteId && atual?.visitanteId) continue; // já resolvida no banco

    for (const label of [slot.mandanteLabel, slot.visitanteLabel]) {
      const m = label.match(/^[WL](\d+)$/);
      if (!m) continue;
      const srcNum = Number(m[1]);
      const srcPartida = porNumero.get(srcNum);
      if (!srcPartida || srcPartida.status !== "encerrada") {
        pendentes[slot.fase] ??= [];
        const srcSlot = BRACKET_2026.find((p) => p.numero === srcNum);
        const descricao = srcSlot
          ? `Jogo ${srcNum} (${srcSlot.mandanteLabel} × ${srcSlot.visitanteLabel})`
          : `Jogo ${srcNum}`;
        if (!pendentes[slot.fase].includes(descricao)) pendentes[slot.fase].push(descricao);
      }
    }
  }

  const fasesPendentes = Object.keys(pendentes);
  if (fasesPendentes.length > 0) {
    console.log("\n=== Falta encerrar para resolver ===");
    for (const fase of fasesPendentes) {
      console.log(`  ${fase}:`);
      for (const jogo of pendentes[fase]) {
        console.log(`    - ${jogo}`);
      }
    }
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
       WHERE fase = $3 AND mandante_label = $4 AND visitante_label = $5`,
      [c.mandanteId, c.visitanteId, c.fase, c.mandanteLabel, c.visitanteLabel]
    );
    atualizadas += result.rowCount ?? 0;
  }
  console.log(`\n${atualizadas} partida(s) atualizada(s).`);
}

main().catch((erro: Error) => {
  console.error("ERRO:", erro.message);
  process.exit(1);
});
