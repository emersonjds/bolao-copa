/**
 * UUID fixo do bolão padrão, inserido na migration 0002.
 * Todos os participantes são inscritos automaticamente neste bolão ao criar conta
 * (via trigger handle_new_user na migration 0004).
 */
export const BOLAO_PADRAO_ID = "00000000-0000-0000-0000-000000000b01" as const;
