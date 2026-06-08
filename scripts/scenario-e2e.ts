/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Seed de cenário para testar a mecânica do bolão NA TELA, contra o Supabase
 * LOCAL (supabase start). Idempotente — pode rodar quantas vezes quiser.
 *
 * Cria 5 contas de teste e ENCERRA a maioria dos jogos de TODAS as fases
 * (grupos → 32-avos → oitavas → quartas → semi → 3º lugar → final) com placar,
 * dando às 5 contas palpites que disparam cada balde de pontos (5/4/3/2/0).
 * Empates de mata-mata recebem "vencedor nos pênaltis" pra provar que pênalti
 * NÃO conta. Deixa a última rodada de grupos ABERTA pra dar pra palpitar.
 *
 * Uso: pnpm scenario:seed   (lê .env.test, nunca prod)
 */
import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";
import fs from "node:fs";
import path from "node:path";

// ── carrega .env.test ────────────────────────────────────────────────────────
const envTest = path.join(process.cwd(), ".env.test");
for (const linha of fs.readFileSync(envTest, "utf-8").split("\n")) {
  const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !linha.trimStart().startsWith("#")) {
    process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Senha-Demo-2026!";
const BOLAO = "00000000-0000-0000-0000-000000000b01";
// Conexão direta ao Postgres local (porta 54322 é o padrão da CLI do Supabase).
// Usada exclusivamente no passo de inserção de palpites, onde desabilitamos
// temporariamente os triggers via session_replication_role para que o seed possa
// inserir palpites em jogos cujas janelas ainda não abriram (futuro).
const DB_URL =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
// Quantos jogos de grupos deixar ABERTOS (sem placar) pra dar pra palpitar.
const GRUPOS_ABERTOS = 9;

// Guarda anti-prod: só roda contra o local.
if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) {
  throw new Error(`ABORTADO: a URL não é local (${URL}). Esse seed só roda no Supabase local.`);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ORDEM_FASE: Record<string, number> = {
  grupos: 0,
  "trinta-e-dois": 1,
  oitavas: 2,
  quartas: 3,
  semifinal: 4,
  "terceiro-lugar": 5,
  final: 6,
};

// Pool de placares variados (vitórias mandante/visitante e empates), ciclado
// pelo índice global do jogo — determinístico.
const RES: number[][] = [
  [2, 1],
  [0, 0],
  [1, 2],
  [3, 1],
  [1, 1],
  [0, 1],
  [2, 2],
  [1, 0],
  [2, 3],
  [0, 2],
];

// Estratégia de palpite por conta, ciclada pelo índice do jogo:
//   E = crava o placar | S = acerta o resultado (placar errado) | W = erra
type Estrategia = "E" | "S" | "W";
const CONTAS: { email: string; nome: string; ciclo: Estrategia[] }[] = [
  { email: "ana@bolao.test", nome: "Ana Atacante", ciclo: ["E", "E", "E", "S"] },
  { email: "bruno@bolao.test", nome: "Bruno Zagueiro", ciclo: ["E", "S", "S", "E"] },
  { email: "demo@bolao.test", nome: "Você (Demo)", ciclo: ["E", "S", "W", "S"] },
  { email: "carla@bolao.test", nome: "Carla Meio", ciclo: ["S", "W", "W", "E"] },
  { email: "diego@bolao.test", nome: "Diego Lanterna", ciclo: ["W", "W", "S", "W"] },
];

function palpiteDe(estrategia: Estrategia, res: number[]): [number, number] {
  const [hm, ha] = res;
  if (estrategia === "E") return [hm, ha];
  if (estrategia === "S") {
    if (hm > ha) return [hm + 1, ha]; // mandante vence, placar diferente
    if (hm < ha) return [hm, ha + 1]; // visitante vence, placar diferente
    return [hm + 1, ha + 1]; // empate, placar diferente
  }
  // W: força resultado oposto → 0 pontos
  return hm < ha ? [3, 0] : [0, 3];
}

async function ensureUser(email: string, nome: string): Promise<string> {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existente = list.users.find((u) => u.email === email);
  if (existente) return existente.id;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: nome },
  });
  if (error || !data.user) throw new Error(`Falha ao criar ${email}: ${error?.message}`);
  return data.user.id;
}

async function main() {
  const pgClient = new Client({ connectionString: DB_URL });
  await pgClient.connect();

  try {
    await run(pgClient);
  } finally {
    await pgClient.end();
  }
}

async function run(pgClient: Client) {
  console.log("→ garantindo contas de teste…");
  const participantes: { nome: string; participanteId: string }[] = [];
  for (const c of CONTAS) {
    const userId = await ensureUser(c.email, c.nome);
    const { data: pa, error } = await admin
      .from("participantes")
      .select("id")
      .eq("user_id", userId)
      .eq("bolao_id", BOLAO)
      .single();
    if (error || !pa) throw new Error(`Sem participante para ${c.email}: ${error?.message}`);
    participantes.push({ nome: c.nome, participanteId: pa.id });
  }
  const participanteIds = participantes.map((p) => p.participanteId);

  console.log("→ carregando todos os jogos…");
  const { data: todos, error: errJogos } = await admin
    .from("partidas")
    .select("id, fase, data_hora")
    .order("data_hora", { ascending: true });
  if (errJogos || !todos) throw new Error(`Falha ao ler partidas: ${errJogos?.message}`);

  // Ordena por (fase, data) e decide quais grupos ficam abertos (os últimos N).
  const ordenados = [...todos].sort(
    (a, b) => ORDEM_FASE[a.fase] - ORDEM_FASE[b.fase] || a.data_hora.localeCompare(b.data_hora)
  );
  const gruposPorData = todos
    .filter((j) => j.fase === "grupos")
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  const abertos = new Set(gruposPorData.slice(-GRUPOS_ABERTOS).map((j) => j.id));
  const fechados = ordenados.filter((j) => !abertos.has(j.id));

  // Todas as seleções — usadas pra (1) preencher mata-mata com times reais e
  // (2) escolher um "vencedor nos pênaltis" (a FK exige seleção real).
  const { data: sels } = await admin.from("selecoes").select("id").order("codigo");
  const selIds = (sels ?? []).map((s) => s.id);
  const penaltiSelecao = selIds[0];

  console.log("→ resetando estado anterior do cenário…");
  await admin
    .from("partidas")
    .update({
      status: "agendada",
      gols_mandante: null,
      gols_visitante: null,
      vencedor_penaltis: null,
    })
    .neq("status", "x"); // todas
  await admin.from("palpites").delete().in("participante_id", participanteIds);

  console.log(`→ palpitando ${fechados.length} jogos × ${CONTAS.length} contas…`);
  const rows = fechados.flatMap((jogo, gi) =>
    CONTAS.map((conta, ci) => {
      const res = RES[gi % RES.length];
      const estrategia = conta.ciclo[gi % conta.ciclo.length];
      const [gm, gv] = palpiteDe(estrategia, res);
      return {
        participante_id: participanteIds[ci],
        partida_id: jogo.id,
        gols_mandante: gm,
        gols_visitante: gv,
      };
    })
  );

  // Insere palpites via conexão pg direta com triggers desabilitados para a
  // sessão. Necessário porque a janela de palpites (0019) bloqueia inserts antes
  // da meia-noite BRT do dia do jogo: jogos futuros da Copa ainda não têm a
  // janela aberta no momento do seed. A desabilitação é cirúrgica: só cobre
  // esta sessão, só este bloco, e é sempre revertida no finally. Não toca na
  // conexão supabase-js usada nas outras etapas — o trigger trg_apurar_pontos
  // (AFTER UPDATE em partidas, etapa seguinte) não é afetado.
  await pgClient.query("SET session_replication_role = replica");
  try {
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      await pgClient.query(
        `INSERT INTO palpites (participante_id, partida_id, gols_mandante, gols_visitante)
         SELECT * FROM unnest($1::uuid[], $2::uuid[], $3::int[], $4::int[])`,
        [
          batch.map((r) => r.participante_id),
          batch.map((r) => r.partida_id),
          batch.map((r) => r.gols_mandante),
          batch.map((r) => r.gols_visitante),
        ]
      );
    }
  } finally {
    await pgClient.query("SET session_replication_role = DEFAULT");
  }

  console.log(`→ encerrando ${fechados.length} jogos com placar (dispara a apuração)…`);
  let kc = 0; // contador de jogos de mata-mata, pra parear seleções reais
  for (let gi = 0; gi < fechados.length; gi++) {
    const jogo = fechados[gi];
    const res = RES[gi % RES.length];
    const empate = res[0] === res[1];
    const ehMataMata = jogo.fase !== "grupos";
    // Mata-mata vem com times indefinidos (rótulos "W74", "2B"). Preenche
    // seleções reais e distintas pra tela mostrar nome + bandeira. Não é um
    // chaveamento "correto" (um time pode reaparecer em fases diferentes) —
    // é só pra dar cara real às telas de cada fase.
    const times = ehMataMata
      ? {
          mandante_id: selIds[(2 * kc) % selIds.length],
          visitante_id: selIds[(2 * kc + 1) % selIds.length],
        }
      : {};
    if (ehMataMata) kc++;
    const { error } = await admin
      .from("partidas")
      .update({
        status: "encerrada",
        gols_mandante: res[0],
        gols_visitante: res[1],
        vencedor_penaltis: empate && ehMataMata ? penaltiSelecao : null,
        ...times,
      })
      .eq("id", jogo.id);
    if (error) throw new Error(`Falha ao encerrar jogo ${jogo.id}: ${error.message}`);
  }

  // ── relatório ──────────────────────────────────────────────────────────────
  const porFase = new Map<string, number>();
  for (const j of fechados) porFase.set(j.fase, (porFase.get(j.fase) ?? 0) + 1);
  console.log("\n📊 Jogos encerrados por fase:");
  for (const fase of Object.keys(ORDEM_FASE)) {
    console.log(`  ${fase.padEnd(16)} ${porFase.get(fase) ?? 0}`);
  }
  console.log(`  (grupos abertos p/ palpitar: ${abertos.size})`);

  console.log("\n🏆 Ranking (get_ranking):");
  const { data: ranking, error: errRk } = await admin.rpc("get_ranking");
  if (errRk) throw new Error(`get_ranking falhou: ${errRk.message}`);
  for (const [i, r] of (
    ranking as { nome: string; pontos_totais: number; jogos_pontuados: number }[]
  ).entries()) {
    console.log(
      `  ${i + 1}º ${r.nome.padEnd(16)} ${r.pontos_totais} pts (${r.jogos_pontuados} jogos)`
    );
  }

  console.log("\n✅ Cenário pronto. Senha de todas as contas:", PASSWORD);
  console.log("   Logins:", CONTAS.map((c) => c.email).join(", "));
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
