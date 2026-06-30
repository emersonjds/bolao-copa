import { DIVISAO_PREMIO } from "@/shared/lib/constants";

export interface DivisaoPremio {
  primeiro: number;
  segundo: number;
  terceiro: number;
}

/**
 * Divide o pote entre os 3 primeiros segundo DIVISAO_PREMIO. Arredonda 2º e 3º
 * para baixo (inteiros) e dá o restante ao 1º, garantindo que a soma das partes
 * seja exatamente igual ao pote (nenhum centavo vaza ou some).
 */
export function dividirPote(pote: number): DivisaoPremio {
  const segundo = Math.floor(pote * DIVISAO_PREMIO.segundo);
  const terceiro = Math.floor(pote * DIVISAO_PREMIO.terceiro);
  const primeiro = pote - segundo - terceiro;
  return { primeiro, segundo, terceiro };
}
