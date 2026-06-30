/* eslint-disable no-console -- script de CLI: o output no terminal é o objetivo */
/**
 * Envio de TESTE do lembrete para destinatários específicos (validar entrega).
 * NÃO usa o cenário local — aponta pro PROD. Lê credenciais de `.env.teste`
 * (gitignored) ou do ambiente. Só LÊ o banco (profiles + auth) e ENVIA e-mail;
 * não escreve nada no bolão.
 *
 * Passo 1 — crie `.env.teste` na raiz (já está no .gitignore) com:
 *   NEXT_PUBLIC_SUPABASE_URL=https://gbspiwzdqkbhkckdaajz.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<sb_secret de PROD>
 *   GMAIL_USER=resenhabolaodacopa@gmail.com
 *   GMAIL_APP_PASSWORD=<as 16 letras da senha de app>
 *
 * Passo 2 — rode passando os alvos (e-mail OU nome pra buscar no banco):
 *   pnpm exec tsx scripts/notificar-teste.ts emerson.silvan@gmail.com "joao gustavo"
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { renderLembrete } from "./lib/email-template";

const REMETENTE = "Resenha Bolão da Copa";
const APP_URL = "https://resenha-bolao-da-copa.netlify.app/palpites";
const URL_PROD_PADRAO = "https://gbspiwzdqkbhkckdaajz.supabase.co";

// Conteúdo de amostra (marcado [TESTE] no assunto) só pra provar a entrega.
const AMOSTRA = {
  jogos: [
    { mandante: "Brasil", visitante: "Sérvia", horaBrt: "16:00" },
    { mandante: "Argentina", visitante: "México", horaBrt: "20:00" },
  ],
  prazo: "16:00",
};

/** Carrega .env.teste no process.env (vars já definidas têm prioridade). */
function carregarEnvTeste(): void {
  const arquivo = path.join(process.cwd(), ".env.teste");
  if (!fs.existsSync(arquivo)) return;
  for (const linha of fs.readFileSync(arquivo, "utf-8").split("\n")) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !linha.trimStart().startsWith("#")) {
      process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const semAcento = (texto: string): string =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

async function main() {
  carregarEnvTeste();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? URL_PROD_PADRAO;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) {
    throw new Error("Faltam GMAIL_USER e GMAIL_APP_PASSWORD (crie .env.teste).");
  }

  const simples = process.argv.includes("--simples"); // teste bare (sem link)
  const alvos = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  if (alvos.length === 0) {
    throw new Error(
      'Passe ao menos um alvo: e-mail ou nome. Ex.: ... emerson@x.com "joao gustavo"'
    );
  }

  // Só precisa do banco (service_role) se algum alvo for um NOME a resolver.
  // Pra enviar a um e-mail direto, basta a senha de app do Gmail.
  const temNome = alvos.some((alvo) => !alvo.includes("@"));
  let perfis: { id: string; nome: string }[] = [];
  const emailPorId = new Map<string, string>();
  if (temNome) {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      throw new Error(
        "Pra buscar por NOME, defina SUPABASE_SERVICE_ROLE_KEY (sb_secret de PROD) no .env.teste."
      );
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: ps, error: erroPerfis } = await admin.from("profiles").select("id,nome");
    if (erroPerfis) throw new Error(`profiles: ${erroPerfis.message}`);
    perfis = ps ?? [];
    const { data: usuarios, error: erroUsers } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (erroUsers) throw new Error(`auth.users: ${erroUsers.message}`);
    for (const usuario of usuarios.users) emailPorId.set(usuario.id, usuario.email ?? "");
  }

  const destinatarios: { nome: string; email: string }[] = [];
  for (const alvo of alvos) {
    if (alvo.includes("@")) {
      destinatarios.push({ nome: alvo.split("@")[0], email: alvo });
      console.log(`📧 alvo direto: ${alvo}`);
      continue;
    }
    const achados = (perfis ?? []).filter((p) => semAcento(p.nome).includes(semAcento(alvo)));
    if (achados.length === 0) {
      console.log(`⚠️  ninguém com nome ~ "${alvo}" no banco — pulando`);
      continue;
    }
    for (const p of achados) {
      const email = emailPorId.get(p.id) ?? "";
      console.log(`🔎 "${alvo}" → ${p.nome} <${email || "SEM e-mail"}>`);
      if (email) destinatarios.push({ nome: p.nome, email });
    }
  }

  if (destinatarios.length === 0) throw new Error("Nenhum destinatário resolvido — nada enviado.");

  const transporte = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: gmailUser, pass: gmailPass },
  });

  console.log(`\n→ enviando ${destinatarios.length} e-mail(s) de teste…`);
  for (const dest of destinatarios) {
    let corpo: { subject: string; text: string };
    if (simples) {
      corpo = {
        subject: "Teste de envio do bolao",
        text: `Oi ${dest.nome}, isso e um teste de envio em texto puro do bolao. Se chegou, o envio esta funcionando.`,
      };
    } else {
      const r = renderLembrete({
        jogos: AMOSTRA.jogos,
        prazo: AMOSTRA.prazo,
        appUrl: APP_URL,
      });
      corpo = { subject: `[TESTE] ${r.assunto}`, text: r.texto };
    }
    const info = await transporte.sendMail({
      from: `"${REMETENTE}" <${gmailUser}>`,
      to: dest.email,
      ...corpo,
    });
    console.log(`✅ ${dest.email}`);
    console.log(`   messageId: ${info.messageId}`);
    console.log(`   resposta:  ${info.response}`);
    console.log(`   accepted:  ${JSON.stringify(info.accepted)}`);
    console.log(`   rejected:  ${JSON.stringify(info.rejected)}`);
  }
  console.log("\n🎉 Teste concluído. Confira as caixas de entrada (e o spam).");
}

main().catch((erro: Error) => {
  console.error("❌", erro.message);
  process.exit(1);
});
