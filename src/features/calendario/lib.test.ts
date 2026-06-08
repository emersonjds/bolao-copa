import { describe, it, expect } from "vitest";
import type { Partida } from "@/entities/partida";
import {
  toDateKey,
  formatarHeaderDia,
  formatarHorario,
  getWeekStart,
  getFaseBadge,
  groupByDay,
} from "./lib";

// Builder de Partida no formato de domínio (camelCase). Datas SEM "Z" para
// serem interpretadas no fuso local — garante determinismo independente da TZ.
function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T16:00:00",
    janelaInicio: "2026-06-11T03:00:00Z",
    estadio: "Mexico City",
    status: "agendada",
    mandante: { id: "sel-mex", nome: "México", codigo: "MEX" },
    visitante: { id: "sel-rsa", nome: "África do Sul", codigo: "RSA" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...overrides,
  };
}

describe("toDateKey", () => {
  it("formata uma data como YYYY-MM-DD no fuso local", () => {
    expect(toDateKey(new Date(2026, 5, 9))).toBe("2026-06-09");
  });

  it("aplica zero à esquerda em mês e dia de um dígito", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("preserva dois dígitos em mês e dia", () => {
    expect(toDateKey(new Date(2026, 11, 25))).toBe("2026-12-25");
  });
});

describe("formatarHeaderDia", () => {
  it("formata um sábado em caixa alta com dia e mês abreviados", () => {
    // 13/jun/2026 é um sábado.
    expect(formatarHeaderDia(new Date(2026, 5, 13))).toBe("SÁB, 13 JUN");
  });

  it("usa a abreviação correta para domingo (índice 0)", () => {
    // 14/jun/2026 é um domingo.
    expect(formatarHeaderDia(new Date(2026, 5, 14))).toBe("DOM, 14 JUN");
  });

  it("usa a abreviação correta para janeiro", () => {
    expect(formatarHeaderDia(new Date(2026, 0, 1))).toBe("QUI, 1 JAN");
  });
});

describe("formatarHorario", () => {
  it("formata hora e minuto como HHhMM", () => {
    expect(formatarHorario("2026-06-11T16:30:00")).toBe("16h30");
  });

  it("aplica zero à esquerda em hora e minuto", () => {
    expect(formatarHorario("2026-06-11T09:05:00")).toBe("09h05");
  });

  it("formata meia-noite como 00h00", () => {
    expect(formatarHorario("2026-06-11T00:00:00")).toBe("00h00");
  });
});

describe("getWeekStart", () => {
  it("retorna o domingo anterior a uma quarta-feira", () => {
    // 10/jun/2026 é quarta (getDay 3) → volta para domingo 07/jun.
    const inicio = getWeekStart(new Date(2026, 5, 10));
    expect(toDateKey(inicio)).toBe("2026-06-07");
    expect(inicio.getDay()).toBe(0);
  });

  it("mantém a própria data quando já é domingo", () => {
    const inicio = getWeekStart(new Date(2026, 5, 7));
    expect(toDateKey(inicio)).toBe("2026-06-07");
  });

  it("zera horas, minutos, segundos e milissegundos", () => {
    const inicio = getWeekStart(new Date(2026, 5, 10, 23, 59, 59, 999));
    expect(inicio.getHours()).toBe(0);
    expect(inicio.getMinutes()).toBe(0);
    expect(inicio.getSeconds()).toBe(0);
    expect(inicio.getMilliseconds()).toBe(0);
  });

  it("não muta a data recebida", () => {
    const original = new Date(2026, 5, 10, 12, 0, 0);
    const copia = new Date(original);
    getWeekStart(original);
    expect(original.getTime()).toBe(copia.getTime());
  });
});

describe("getFaseBadge", () => {
  it("retorna Gr.<letra> para fase de grupos com grupo definido", () => {
    expect(getFaseBadge(makePartida({ fase: "grupos", grupo: "C" }))).toBe("Gr.C");
  });

  it("retorna o rótulo de grupos quando a fase é grupos mas sem grupo", () => {
    expect(getFaseBadge(makePartida({ fase: "grupos", grupo: null }))).toBe("Grupos");
  });

  it("retorna R32 para a fase trinta-e-dois", () => {
    expect(getFaseBadge(makePartida({ fase: "trinta-e-dois", grupo: null }))).toBe("R32");
  });

  it("retorna Oitavas para a fase oitavas", () => {
    expect(getFaseBadge(makePartida({ fase: "oitavas", grupo: null }))).toBe("Oitavas");
  });

  it("retorna Quartas para a fase quartas", () => {
    expect(getFaseBadge(makePartida({ fase: "quartas", grupo: null }))).toBe("Quartas");
  });

  it("retorna Semis para a semifinal", () => {
    expect(getFaseBadge(makePartida({ fase: "semifinal", grupo: null }))).toBe("Semis");
  });

  it("retorna 3º lugar para a disputa de terceiro lugar", () => {
    expect(getFaseBadge(makePartida({ fase: "terceiro-lugar", grupo: null }))).toBe("3º lugar");
  });

  it("retorna Final para a final", () => {
    expect(getFaseBadge(makePartida({ fase: "final", grupo: null }))).toBe("Final");
  });
});

describe("groupByDay", () => {
  it("retorna lista vazia para entrada vazia", () => {
    expect(groupByDay([])).toEqual([]);
  });

  it("agrupa partidas do mesmo dia e ordena os dias em ordem crescente", () => {
    const jogoDia12 = makePartida({ id: "d12", dataHora: "2026-06-12T16:00:00" });
    const jogoDia11a = makePartida({ id: "d11a", dataHora: "2026-06-11T13:00:00" });
    const jogoDia11b = makePartida({ id: "d11b", dataHora: "2026-06-11T20:00:00" });

    // Propositalmente fora de ordem para validar a ordenação.
    const grupos = groupByDay([jogoDia12, jogoDia11a, jogoDia11b]);

    expect(grupos.map((g) => g.dateKey)).toEqual(["2026-06-11", "2026-06-12"]);
    expect(grupos[0].partidas.map((p) => p.id)).toEqual(["d11a", "d11b"]);
    expect(grupos[1].partidas.map((p) => p.id)).toEqual(["d12"]);
  });

  it("expõe a data e a dateKey coerentes para cada grupo", () => {
    const jogo = makePartida({ dataHora: "2026-06-11T16:00:00" });
    const [grupo] = groupByDay([jogo]);
    expect(grupo.dateKey).toBe("2026-06-11");
    expect(toDateKey(grupo.date)).toBe("2026-06-11");
  });
});
