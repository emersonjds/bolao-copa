export interface JogoEmail {
  mandante: string;
  visitante: string;
  horaBrt: string;
}

export interface DadosLembrete {
  nome: string;
  jogos: JogoEmail[];
  prazo: string;
  appUrl: string;
}

export interface EmailRenderizado {
  assunto: string;
  html: string;
  texto: string;
}

const VERDE = "#16a34a";

/** Monta o e-mail de lembrete (PT-BR, identidade verde do app). Função pura. */
export function renderLembrete(dados: DadosLembrete): EmailRenderizado {
  const n = dados.jogos.length;
  const assunto = `⚽ Bolão: você tem ${n} palpite${n > 1 ? "s" : ""} para hoje`;

  const linhasHtml = dados.jogos
    .map(
      (jogo) =>
        `<tr><td style="padding:6px 0;font-size:16px;color:#111827;">` +
        `${jogo.mandante} <span style="color:#6b7280;">×</span> ${jogo.visitante}` +
        `</td><td style="padding:6px 0;font-size:16px;color:#6b7280;text-align:right;">${jogo.horaBrt}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:480px;width:100%;">
<tr><td style="background:${VERDE};padding:20px 24px;color:#ffffff;font-size:20px;font-weight:bold;">⚽ Resenha Bolão da Copa</td></tr>
<tr><td style="padding:24px;">
<p style="margin:0 0 12px;font-size:16px;color:#111827;">Fala, ${dados.nome}! 👋</p>
<p style="margin:0 0 16px;font-size:16px;color:#374151;">Os palpites de hoje já abriram e você ainda não palpitou em <b>${n}</b> jogo${n > 1 ? "s" : ""}:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin-bottom:16px;">${linhasHtml}</table>
<p style="margin:0 0 20px;font-size:14px;color:#b45309;">⏰ O primeiro jogo trava às <b>${dados.prazo}</b>. Não vacila!</p>
<a href="${dados.appUrl}" style="display:inline-block;background:${VERDE};color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:12px 24px;border-radius:8px;">Fazer meus palpites</a>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af;">Não quer mais estes lembretes? É só responder este e-mail.</td></tr>
</table></td></tr></table></body></html>`;

  const linhasTexto = dados.jogos.map((jogo) => `- ${jogo.mandante} x ${jogo.visitante} (${jogo.horaBrt})`).join("\n");
  const texto =
    `Fala, ${dados.nome}!\n\n` +
    `Os palpites de hoje abriram e você ainda não palpitou em ${n} jogo(s):\n${linhasTexto}\n\n` +
    `O primeiro jogo trava às ${dados.prazo}.\n\n` +
    `Faça seus palpites: ${dados.appUrl}\n\n` +
    `Não quer mais estes lembretes? Responde este e-mail.`;

  return { assunto, html, texto };
}
