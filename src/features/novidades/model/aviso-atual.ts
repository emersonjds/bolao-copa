export interface ItemNovidade {
  emoji: string;
  titulo: string;
  descricao: string;
}

/** Pré-condição de dados para um aviso aparecer (resolvida na camada api). */
export type Gatilho = "mata-mata-definido";

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

export const AVISOS: Aviso[] = [AVISO_ATUAL, AVISO_MATA_MATA];
