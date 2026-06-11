export interface JogoEmail {
  mandante: string;
  visitante: string;
  horaBrt: string;
}

export interface DadosLembrete {
  jogos: JogoEmail[];
  prazo: string;
  appUrl: string;
}

export interface EmailRenderizado {
  assunto: string;
  texto: string;
}

/**
 * Monta o e-mail de lembrete em TEXTO PURO (PT-BR, com emojis). Função pura.
 *
 * Texto puro de propósito: a conta remetente é nova e o Gmail DROPA o HTML
 * (cai como abuso, nem no spam) — texto puro entrega na caixa de entrada
 * (validado em 2026-06-11). Saudação genérica, sem nome.
 */
export function renderLembrete(dados: DadosLembrete): EmailRenderizado {
  const n = dados.jogos.length;
  const assunto = `⚽ Bolão: você tem ${n} palpite${n > 1 ? "s" : ""} para hoje`;

  const linhasTexto = dados.jogos
    .map((jogo) => `• ${jogo.mandante} x ${jogo.visitante}  🕐 ${jogo.horaBrt}`)
    .join("\n");

  const texto =
    `⚽ Fala, craque! Pronto pros palpites de hoje? 🎯\n\n` +
    `🔓 Abriram os jogos de hoje e você ainda não palpitou em ${n} jogo${n > 1 ? "s" : ""}:\n\n` +
    `${linhasTexto}\n\n` +
    `⏰ Corre que o primeiro jogo trava às ${dados.prazo}! 🚨\n\n` +
    `👉 Faça seus palpites: ${dados.appUrl}\n\n` +
    `🔕 Não quer mais estes lembretes? É só responder este e-mail.`;

  return { assunto, texto };
}
