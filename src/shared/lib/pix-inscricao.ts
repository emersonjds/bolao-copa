/**
 * Fonte única de verdade do PIX da inscrição.
 *
 * O `brCode` é o payload EMV (BR Code "copia e cola") do qual o QR e o botão
 * copiar derivam — nunca um payload dinâmico, nada vindo de rede/URL/prop. Como
 * o BR Code carrega seu próprio CRC16, adulterar a chave/recebedor sem recomputar
 * o checksum quebra `verificarCrcPix()` (e o teste), impedindo que o destino do
 * pagamento seja desviado silenciosamente.
 *
 * NOTA: este `brCode` é um PIX estático VÁLIDO gerado a partir da chave-telefone
 * do recebedor (`+5511948772834`, sem valor). Para reconciliação exata, basta
 * substituir pela string "copia e cola" gerada pelo app do banco do recebedor —
 * os mesmos testes (CRC16 + chave presente) continuam validando.
 */
export const PIX_INSCRICAO = {
  /** Chave PIX (telefone, só dígitos) usada para roteamento do pagamento. */
  chave: "11948772834",
  /** Forma legível da chave para exibição. */
  chaveFormatada: "11 94877-2834",
  recebedor: "JOAO GUSTAVO TOMAZ BARBOSA",
  /** Prazo limite para pagar a inscrição. */
  prazo: "10/06/2026",
  /** Contato (WhatsApp) do organizador para receber o comprovante de pagamento. */
  contatoComprovante: "11971801555",
  /** Forma legível do contato do organizador. */
  contatoComprovanteFormatado: "11 97180-1555",
  /** Payload EMV completo (BR Code) — fonte única do QR e do "copia e cola". */
  brCode:
    "00020126360014br.gov.bcb.pix0114+55119487728345204000053039865802BR5925JOAO GUSTAVO TOMAZ BARBOS6009SAO PAULO62070503***6304ABD0",
} as const;

/**
 * Recalcula o CRC16-CCITT (polinômio 0x1021, init 0xFFFF, sem reflexão) sobre o
 * BR Code menos os 4 dígitos finais e compara com o CRC declarado no fim da
 * string. Retorna `false` se o payload foi alterado sem recomputar o checksum —
 * é o que torna a adulteração do destino do pagamento detectável.
 */
export function verificarCrcPix(brCode: string): boolean {
  if (brCode.length < 4) return false;
  const corpo = brCode.slice(0, -4);
  const declarado = brCode.slice(-4).toUpperCase();
  return calcularCrc16(corpo) === declarado;
}

function calcularCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
