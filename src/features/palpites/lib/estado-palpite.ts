import type { Partida } from "@/entities/partida";

export type EstadoPalpite = "liberado" | "futuro" | "encerrado";

/**
 * Margem antes do apito em que o palpite trava. Espelha a mesma regra no servidor
 * (enforce_palpite_lock): fecha 5 min antes do início — folga contra edição de
 * última hora e relógio fora de sincronia.
 */
export const MARGEM_APITO_MS = 5 * 60 * 1000;

/**
 * Estado de um jogo na tela de palpites, derivado dos instantes (epoch). A regra
 * de fuso já foi resolvida no servidor (Partida.janelaInicio); aqui só comparamos
 * instantes — nada de cálculo de meia-noite no cliente.
 */
export function estadoPalpite(partida: Partida, agora: number): EstadoPalpite {
  if (
    partida.status !== "agendada" ||
    new Date(partida.dataHora).getTime() - MARGEM_APITO_MS <= agora
  ) {
    return "encerrado";
  }
  if (agora < new Date(partida.janelaInicio).getTime()) {
    return "futuro";
  }
  return "liberado";
}

/** Jogos liberados hoje + o grupo futuro de MENOR janela_inicio (só o próximo dia). */
export function filtrarHojeEProximoDia(partidas: Partida[], agora: number): Partida[] {
  const liberadas = partidas.filter((p) => estadoPalpite(p, agora) === "liberado");
  const futuras = partidas.filter((p) => estadoPalpite(p, agora) === "futuro");
  if (futuras.length === 0) return liberadas;
  const proxima = Math.min(...futuras.map((p) => new Date(p.janelaInicio).getTime()));
  const proximoDia = futuras.filter((p) => new Date(p.janelaInicio).getTime() === proxima);
  return [...liberadas, ...proximoDia];
}

/** Próximo instante (ms) em que a UI muda: abre um futuro ou fecha um liberado. */
export function proximaBorda(partidas: Partida[], agora: number): number | null {
  const instantes: number[] = [];
  for (const p of partidas) {
    const estado = estadoPalpite(p, agora);
    if (estado === "futuro") instantes.push(new Date(p.janelaInicio).getTime());
    else if (estado === "liberado")
      instantes.push(new Date(p.dataHora).getTime() - MARGEM_APITO_MS);
  }
  const futuros = instantes.filter((t) => t > agora);
  return futuros.length > 0 ? Math.min(...futuros) : null;
}
