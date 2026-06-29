export interface ItemNovidade {
  emoji: string;
  titulo: string;
  descricao: string;
}

/** Pré-condição de dados para um aviso aparecer (resolvida na camada api). */
export type Gatilho =
  | "mata-mata-definido"
  | "oitavas-definido"
  | "quartas-definido"
  | "semifinal-definido"
  | "final-definido";

export interface Aviso {
  /** Versão do anúncio: trocar o id faz o modal reaparecer para todos. */
  id: string;
  titulo: string;
  itens: ItemNovidade[];
  /**
   * Só exibe quando este gatilho de dados estiver disponível. Sem gatilho, o
   * aviso aparece assim que não estiver visto. Evita anunciar uma fase antes de
   * os confrontos existirem (o usuário dispensaria o modal cedo demais).
   */
  gatilho?: Gatilho;
}

export const AVISO_ATUAL: Aviso = {
  id: "novidades-2026-06",
  titulo: "Novidades no bolão",
  itens: [
    {
      emoji: "🎯",
      titulo: "Palpite antecipado",
      descricao:
        "Agora dá pra deixar seu palpite pronto com antecedência — ele fica salvo e você ajusta até o apito.",
    },
    {
      emoji: "🏆",
      titulo: "Grupos da Copa",
      descricao: "Veja a classificação e o histórico dos jogos de cada grupo na aba Copa.",
    },
  ],
};

export const AVISO_MATA_MATA: Aviso = {
  id: "mata-mata-2026-06",
  titulo: "Começou o mata-mata!",
  gatilho: "mata-mata-definido",
  itens: [
    {
      emoji: "🔥",
      titulo: "Trinta e Dois abertas",
      descricao:
        "Os confrontos das 32-avos já estão definidos — faça seus palpites antes do apito.",
    },
    {
      emoji: "✖️",
      titulo: "Agora os pontos multiplicam",
      descricao:
        "Grupos, 32-avos e 3º lugar valem ×1. Oitavas e quartas ×2. Semi e final ×3 — cravar a final vale 15!",
    },
  ],
};

export const AVISO_OITAVAS: Aviso = {
  id: "oitavas-2026",
  titulo: "Começaram as oitavas!",
  gatilho: "oitavas-definido",
  itens: [
    {
      emoji: "✖️",
      titulo: "Agora vale ×2",
      descricao: "Cada acerto nas oitavas vale o dobro de pontos. Capricha no palpite.",
    },
    {
      emoji: "⚔️",
      titulo: "Confrontos definidos",
      descricao: "Os classificados das 32-avos já estão chaveados — bola pra frente.",
    },
  ],
};

export const AVISO_QUARTAS: Aviso = {
  id: "quartas-2026",
  titulo: "Quartas de final!",
  gatilho: "quartas-definido",
  itens: [
    {
      emoji: "✖️",
      titulo: "Segue o ×2",
      descricao: "As quartas continuam valendo o dobro. Não vacila agora.",
    },
    {
      emoji: "🏟️",
      titulo: "Oito viraram quatro",
      descricao: "Os vencedores das oitavas já estão nos confrontos.",
    },
  ],
};

export const AVISO_SEMI: Aviso = {
  id: "semifinal-2026",
  titulo: "Semifinal!",
  gatilho: "semifinal-definido",
  itens: [
    {
      emoji: "🔥",
      titulo: "Agora é ×3",
      descricao: "Semi e final valem o triplo — dá pra virar o bolão na reta final.",
    },
    {
      emoji: "🎯",
      titulo: "Quem chega na final?",
      descricao: "Palpite nas duas semis antes do apito.",
    },
  ],
};

export const AVISO_FINAL: Aviso = {
  id: "final-2026",
  titulo: "É a final!",
  gatilho: "final-definido",
  itens: [
    {
      emoji: "🏆",
      titulo: "Cravar vale 15",
      descricao: "A final vale ×3: acertar o placar exato rende 15 pontos.",
    },
    {
      emoji: "🥉",
      titulo: "Tem disputa de 3º",
      descricao: "O jogo do terceiro lugar também conta — não esqueça.",
    },
  ],
};

export const AVISOS: Aviso[] = [
  AVISO_ATUAL,
  AVISO_MATA_MATA,
  AVISO_OITAVAS,
  AVISO_QUARTAS,
  AVISO_SEMI,
  AVISO_FINAL,
];
