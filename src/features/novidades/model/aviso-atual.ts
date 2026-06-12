export interface ItemNovidade {
  emoji: string;
  titulo: string;
  descricao: string;
}

export interface Aviso {
  /** Versão do anúncio: trocar o id faz o modal reaparecer para todos. */
  id: string;
  titulo: string;
  itens: ItemNovidade[];
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
