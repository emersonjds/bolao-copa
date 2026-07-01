/**
 * "Quem passa" efetivo de um palpite de mata-mata empatado.
 *
 * O estado local (placarLocal.vencedorAvanca) tem 3 estados que precisam ser
 * distinguidos:
 *  - undefined → o usuário não mexeu no seletor → herda o valor salvo no servidor
 *  - null      → o usuário escolheu o placeholder "Escolha quem passa" → sem escolha
 *  - string    → o usuário escolheu uma seleção
 *
 * Exibição, pendência, validação e gravação DEVEM usar esta mesma resolução.
 * Senão o seletor exibe um valor (herdado do salvo via `??`) que a validação não
 * enxerga, e o save falha com "escolha quem passa" mesmo com um time aparecendo
 * selecionado — e o placeholder não reflete quando o usuário limpa a escolha.
 */
export function vencedorAvancaEfetivo(
  localVenc: string | null | undefined,
  salvoVenc: string | null | undefined
): string | null {
  return localVenc !== undefined ? localVenc : (salvoVenc ?? null);
}
