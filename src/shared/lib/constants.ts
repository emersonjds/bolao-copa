/**
 * UUID fixo do bolão padrão, inserido na migration 0002.
 * Todos os participantes são inscritos automaticamente neste bolão ao criar conta
 * (via trigger handle_new_user na migration 0004).
 */
export const BOLAO_PADRAO_ID = "00000000-0000-0000-0000-000000000b01" as const;

/** Valor da inscrição por participante, em reais. 100% revertido em prêmios. */
export const VALOR_INSCRICAO = 10 as const;

/** Divisão do pote entre os 3 primeiros do ranking final. Soma = 1. */
export const DIVISAO_PREMIO = {
  primeiro: 0.5,
  segundo: 0.3,
  terceiro: 0.2,
} as const;
