/**
 * Traduz o erro bruto vindo do banco/rede ao salvar um palpite em uma mensagem
 * amigável em PT-BR. A apuração e as travas moram no servidor (fonte de verdade),
 * então o cliente pode receber mensagens técnicas (ex.: a trava de horário do
 * trigger `enforce_palpite_lock`); aqui elas viram texto compreensível, sem
 * "estourar" o erro cru para o usuário.
 */

export type TipoErroSalvar = "lock" | "permissao" | "rede" | "generico";

export interface ErroSalvarAmigavel {
  tipo: TipoErroSalvar;
  /** Texto pronto para exibir no toast. */
  texto: string;
}

export function traduzirErroSalvar(mensagemBruta: string): ErroSalvarAmigavel {
  const msg = mensagemBruta.toLowerCase();

  // Trava de horário: a partida já começou (apito inicial fecha os palpites).
  if (msg.includes("começou") || msg.includes("encerrado")) {
    return {
      tipo: "lock",
      texto: "Tarde demais! Esse jogo já começou e os palpites dele fecharam no apito inicial.",
    };
  }

  // Sem permissão / sessão expirada.
  if (
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("42501") ||
    msg.includes("jwt")
  ) {
    return {
      tipo: "permissao",
      texto: "Sua sessão expirou ou você não tem permissão. Entre novamente para palpitar.",
    };
  }

  // Falha de rede.
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("fetch")) {
    return {
      tipo: "rede",
      texto: "Sem conexão com o servidor. Confira sua internet e tente de novo.",
    };
  }

  return {
    tipo: "generico",
    texto: "Não foi possível salvar agora. Tente novamente em instantes.",
  };
}
