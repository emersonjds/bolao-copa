import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { useRefetchNaBorda } from "./use-refetch-na-borda";

const HORA = 60 * 60 * 1000;
function partida(over: Partial<Partida>): Partida {
  return {
    id: "p", fase: "grupos", grupo: "A", dataHora: "", estadio: "x", status: "agendada",
    mandante: { id: "a", nome: "A", codigo: "AAA" }, visitante: { id: "b", nome: "B", codigo: "BBB" },
    golsMandante: null, golsVisitante: null, vencedorPenaltis: null,
    mandanteLabel: null, visitanteLabel: null, janelaInicio: "", ...over,
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useRefetchNaBorda", () => {
  it("dispara onBorda ao cruzar a próxima borda", () => {
    const agora = Date.now();
    const futuro = partida({ janelaInicio: new Date(agora + HORA).toISOString(), dataHora: new Date(agora + 5 * HORA).toISOString() });
    const onBorda = vi.fn();
    renderHook(() => useRefetchNaBorda([futuro], onBorda));
    expect(onBorda).not.toHaveBeenCalled();
    vi.advanceTimersByTime(HORA + 10);
    expect(onBorda).toHaveBeenCalledTimes(1);
  });

  it("não agenda nada quando não há borda futura", () => {
    const onBorda = vi.fn();
    renderHook(() => useRefetchNaBorda([], onBorda));
    vi.advanceTimersByTime(10 * HORA);
    expect(onBorda).not.toHaveBeenCalled();
  });

  it("não agenda nada quando a borda está além do limite de 32 bits", () => {
    const agora = Date.now();
    const muitoLonge = partida({
      janelaInicio: new Date(agora + 2_147_483_648).toISOString(),
      dataHora: new Date(agora + 2_147_483_648 + HORA).toISOString(),
    });
    const onBorda = vi.fn();
    renderHook(() => useRefetchNaBorda([muitoLonge], onBorda));
    vi.advanceTimersByTime(2000);
    expect(onBorda).not.toHaveBeenCalled();
  });
});
