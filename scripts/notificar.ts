/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Lembrete diário de palpites por e-mail. Só envia em dia com jogo, só para quem
 * ainda não palpitou nos jogos de hoje. Leitura + envio (não altera dados do bolão).
 *
 * Uso:
 *   pnpm notificar                 (hoje, envia de verdade)
 *   pnpm notificar 2026-06-11      (simula "hoje" como 11/06 — útil pra testar)
 *   pnpm notificar 2026-06-11 --dry-run   (calcula e mostra, NÃO envia nem grava)
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (local: .env.test),
 *      GMAIL_USER, GMAIL_APP_PASSWORD (Senha de app da conta dedicada).
 * Spec: docs/superpowers/specs/2026-06-10-lembrete-palpites-email-design.md
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { garantirEnvSupabase } from "./lib/env";
import {
  jogosDeHoje,
  pendencias,
  enviarPendencias,
  type Partida,
  type Participante,
  type Palpite,
  type Perfil,
  type Selecao,
} from "./lib/notificar-core";

const APP_URL = "https://resenha-bolao-da-copa.netlify.app/palpites";
const REMETENTE = "Resenha Bolão da Copa";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const dataArg = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
  // "hoje" às 09:00 BRT (12:00 UTC) do dia escolhido, ou agora.
  const agora = dataArg ? new Date(`${dataArg}T12:00:00Z`) : new Date();

  const { url, serviceKey } = garantirEnvSupabase();
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) dados (tudo pequeno: nada passa de 1000 linhas aqui)
  const [selecoes, partidas, participantes, perfis, authUsers] = await Promise.all([
    admin.from("selecoes").select("id,nome,codigo").then(unwrap<Selecao>("selecoes")),
    admin
      .from("partidas")
      .select("id,data_hora,status,mandante_id,visitante_id,mandante_label,visitante_label")
      .then(unwrap<Partida>("partidas")),
    admin.from("participantes").select("id,user_id").then(unwrap<Participante>("participantes")),
    admin.from("profiles").select("id,nome").then(unwrap<{ id: string; nome: string }>("profiles")),
    listarEmails(admin),
  ]);

  const jogos = jogosDeHoje(partidas, selecoes, agora);
  if (jogos.length === 0) {
    console.log("📭 Sem jogos hoje — nada a enviar.");
    return;
  }

  const emailPorId = new Map(authUsers.map((u) => [u.id, u.email]));
  const perfisCompletos: Perfil[] = perfis.map((p) => ({
    user_id: p.id,
    nome: p.nome,
    email: emailPorId.get(p.id) ?? "",
  }));

  const idsHoje = jogos.map((j) => j.id);
  const palpites = await admin
    .from("palpites")
    .select("participante_id,partida_id")
    .in("partida_id", idsHoje)
    .then(unwrap<Palpite>("palpites"));

  const lista = pendencias(participantes, jogos, palpites, perfisCompletos);
  console.log(
    `→ ${jogos.length} jogo(s) hoje · ${lista.length} participante(s) com palpite pendente`
  );

  if (dryRun) {
    for (const p of lista) {
      console.log(`  [dry-run] ${p.nome} <${p.email}> — ${p.jogos.length} jogo(s)`);
    }
    console.log("\n🧪 dry-run: nada foi enviado.");
    return;
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    throw new Error("Defina GMAIL_USER e GMAIL_APP_PASSWORD (Senha de app da conta dedicada).");
  }

  // 2) anti-duplicata: quem já recebeu hoje
  const hoje = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
  const enviadosHoje = await admin
    .from("lembretes_enviados")
    .select("participante_id")
    .eq("data", hoje)
    .then(unwrap<{ participante_id: string }>("lembretes_enviados"));
  const jaEnviadoSet = new Set(enviadosHoje.map((r) => r.participante_id));

  const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });

  const resumo = await enviarPendencias(lista, {
    appUrl: APP_URL,
    jaEnviado: (id) => jaEnviadoSet.has(id),
    // Texto puro de propósito: o Gmail dropa HTML de remetente novo (validado).
    enviar: async (para, assunto, texto) => {
      await transporte.sendMail({
        from: `"${REMETENTE}" <${gmailUser}>`,
        to: para,
        subject: assunto,
        text: texto,
      });
    },
    registrar: async (id) => {
      const { error } = await admin
        .from("lembretes_enviados")
        .insert({ data: hoje, participante_id: id });
      if (error) throw new Error(`registrar ${id}: ${error.message}`);
    },
  });

  console.log(
    `\n✅ enviados ${resumo.enviados} · pulados ${resumo.pulados} · falhas ${resumo.falhas}`
  );
}

/** Desempacota { data, error } do supabase-js, com erro claro por tabela. */
function unwrap<T>(rotulo: string) {
  return ({ data, error }: { data: unknown; error: { message: string } | null }): T[] => {
    if (error) throw new Error(`Falha ao ler ${rotulo}: ${error.message}`);
    return (data as T[]) ?? [];
  };
}

/** id + e-mail de todas as contas (paginado), como no backup-core. */
async function listarEmails(admin: SupabaseClient): Promise<{ id: string; email: string }[]> {
  const usuarios: { id: string; email: string }[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw new Error(`Falha ao listar auth.users: ${error.message}`);
    for (const u of data.users) usuarios.push({ id: u.id, email: u.email ?? "" });
    if (data.users.length < 1000) break;
  }
  return usuarios;
}

main().catch((erro: Error) => {
  console.error("❌", erro.message);
  process.exit(1);
});
