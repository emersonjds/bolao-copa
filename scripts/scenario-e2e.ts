/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Seed de cenário para testar a mecânica do bolão NA TELA, contra o Supabase
 * LOCAL (supabase start). Idempotente — pode rodar quantas vezes quiser.
 *
 * Cria 5 contas de teste e monta um estado conhecido em TODAS as fases
 * (grupos → 32-avos → oitavas → quartas → semi → 3º lugar → final), com
 * palpites desenhados pra disparar cada balde de pontos (5/4/3/2/0) e dois
 * empates decididos nos pênaltis pra provar que pênalti NÃO conta.
 *
 * Uso: pnpm scenario:seed   (lê .env.test, nunca prod)
 */
import { createClient } from "@supabase/supabase-js";
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

// Guarda anti-prod: só roda contra o local.
if (!URL.includes("127.0.0.1") && !URL.includes("localhost")) {
  throw new Error(`ABORTADO: a URL não é local (${URL}). Esse seed só roda no Supabase local.`);
}

const admin = createClient(URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── cenário ──────────────────────────────────────────────────────────────────
// 7 fases, um jogo cada. res = placar do tempo normal [mandante, visitante].
// pen = empate decidido nos pênaltis (prova que não conta).
const FASES = [
  { fase: "grupos", res: [2, 1] },
  { fase: "trinta-e-dois", res: [1, 1], pen: true },
  { fase: "oitavas", res: [0, 2] },
  { fase: "quartas", res: [3, 1] },
  { fase: "semifinal", res: [1, 1], pen: true },
  { fase: "terceiro-lugar", res: [2, 0] },
  { fase: "final", res: [2, 3] },
] as const;

// Palpites por conta, alinhados por índice de fase. Desenhados pra cobrir
// todos os baldes e gerar um ranking claro.
const CONTAS = [
  {
    email: "ana@bolao.test",
    nome: "Ana Atacante",
    guesses: [
      [2, 1],
      [1, 1],
      [0, 2],
      [3, 1],
      [1, 1],
      [2, 0],
      [2, 3],
    ],
  },
  {
    email: "bruno@bolao.test",
    nome: "Bruno Zagueiro",
    guesses: [
      [3, 1],
      [1, 1],
      [0, 1],
      [2, 0],
      [2, 2],
      [1, 0],
      [1, 2],
    ],
  },
  {
    email: "demo@bolao.test",
    nome: "Você (Demo)",
    guesses: [
      [2, 1],
      [1, 1],
      [0, 1],
      [1, 0],
      [0, 0],
      [0, 2],
      [2, 3],
    ],
  },
  {
    email: "carla@bolao.test",
    nome: "Carla Meio",
    guesses: [
      [0, 0],
      [2, 1],
      [2, 0],
      [1, 1],
      [1, 1],
      [2, 0],
      [0, 0],
    ],
  },
  {
    email: "diego@bolao.test",
    nome: "Diego Lanterna",
    guesses: [
      [1, 2],
      [0, 2],
      [1, 1],
      [0, 1],
      [2, 0],
      [0, 1],
      [1, 3],
    ],
  },
] as const;

// Espelha a regra do apurar_pontos() — só pra imprimir/conferir.
function pontos(res: readonly number[], g: readonly number[]): number {
  const sgn = (a: number, b: number) => Math.sign(a - b);
  const r = sgn(res[0], res[1]);
  const p = sgn(g[0], g[1]);
  if (g[0] === res[0] && g[1] === res[1]) return r === 0 ? 4 : 5;
  if (p === r) return r === 0 ? 2 : 3;
  return 0;
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
  console.log("→ garantindo contas de teste…");
  const participantes: { email: string; nome: string; participanteId: string }[] = [];
  for (const c of CONTAS) {
    const userId = await ensureUser(c.email, c.nome);
    const { data: pa, error } = await admin
      .from("participantes")
      .select("id")
      .eq("user_id", userId)
      .eq("bolao_id", BOLAO)
      .single();
    if (error || !pa) throw new Error(`Sem participante para ${c.email}: ${error?.message}`);
    participantes.push({ email: c.email, nome: c.nome, participanteId: pa.id });
  }

  console.log("→ selecionando 1 jogo por fase…");
  const jogos: { fase: string; id: string }[] = [];
  for (const f of FASES) {
    const { data, error } = await admin
      .from("partidas")
      .select("id")
      .eq("fase", f.fase)
      .order("data_hora", { ascending: true })
      .limit(1);
    if (error || !data?.[0]) throw new Error(`Sem jogo na fase ${f.fase}: ${error?.message}`);
    jogos.push({ fase: f.fase, id: data[0].id });
  }
  const jogoIds = jogos.map((j) => j.id);

  // seleção qualquer pra usar como "vencedor nos pênaltis" (FK exige seleção real)
  const { data: sel } = await admin.from("selecoes").select("id").limit(1).single();
  const penaltiSelecao = sel!.id;

  console.log("→ resetando jogos e palpites antigos do cenário…");
  await admin
    .from("partidas")
    .update({
      status: "agendada",
      gols_mandante: null,
      gols_visitante: null,
      vencedor_penaltis: null,
    })
    .in("id", jogoIds);
  await admin.from("palpites").delete().in("partida_id", jogoIds);

  console.log("→ inserindo palpites (5 contas × 7 fases)…");
  const rows = participantes.flatMap((p, ci) =>
    jogos.map((j, fi) => ({
      participante_id: p.participanteId,
      partida_id: j.id,
      gols_mandante: CONTAS[ci].guesses[fi][0],
      gols_visitante: CONTAS[ci].guesses[fi][1],
    }))
  );
  const { error: errIns } = await admin.from("palpites").insert(rows);
  if (errIns) throw new Error(`Falha ao inserir palpites: ${errIns.message}`);

  console.log("→ encerrando jogos com placar (dispara a apuração)…");
  for (let fi = 0; fi < FASES.length; fi++) {
    const f = FASES[fi];
    const { error } = await admin
      .from("partidas")
      .update({
        status: "encerrada",
        gols_mandante: f.res[0],
        gols_visitante: f.res[1],
        vencedor_penaltis: "pen" in f && f.pen ? penaltiSelecao : null,
      })
      .eq("id", jogos[fi].id);
    if (error) throw new Error(`Falha ao encerrar ${f.fase}: ${error.message}`);
  }

  // ── relatório ──────────────────────────────────────────────────────────────
  console.log("\n📊 Pontos esperados por fase:");
  const totaisEsperados = new Map<string, number>();
  for (let ci = 0; ci < CONTAS.length; ci++) {
    const linha = FASES.map((f, fi) => pontos(f.res, CONTAS[ci].guesses[fi]));
    const total = linha.reduce((a, b) => a + b, 0);
    totaisEsperados.set(CONTAS[ci].nome, total);
    console.log(`  ${CONTAS[ci].nome.padEnd(16)} ${linha.join(" ")}  = ${total}`);
  }

  console.log("\n🏆 Ranking real (get_ranking) no banco:");
  const { data: ranking, error: errRk } = await admin.rpc("get_ranking");
  if (errRk) throw new Error(`get_ranking falhou: ${errRk.message}`);
  for (const [i, r] of (
    ranking as { nome: string; pontos_totais: number; jogos_pontuados: number }[]
  ).entries()) {
    const ok = totaisEsperados.get(r.nome) === r.pontos_totais ? "✓" : "✗ DIVERGE";
    console.log(
      `  ${i + 1}º ${r.nome.padEnd(16)} ${r.pontos_totais} pts (${r.jogos_pontuados} jogos) ${ok}`
    );
  }

  console.log("\n✅ Cenário pronto. Senha de todas as contas:", PASSWORD);
  console.log("   Logins:", CONTAS.map((c) => c.email).join(", "));
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
