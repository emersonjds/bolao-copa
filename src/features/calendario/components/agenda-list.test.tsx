import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Partida } from "@/entities/partida";
import type { GrupoDiaData } from "../lib";
import { AgendaList } from "./agenda-list";

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

function makeGrupo(dateKey: string, mandanteNome: string): GrupoDiaData {
  return {
    dateKey,
    date: new Date(`${dateKey}T12:00:00`),
    partidas: [
      makePartida({ id: dateKey, mandante: { id: "x", nome: mandanteNome, codigo: "BRA" } }),
    ],
  };
}

interface PropsOverrides {
  groups?: GrupoDiaData[];
  selectedDate?: string | null;
  todayKey?: string;
  proximoDia?: GrupoDiaData | null;
  mostrarCta?: boolean;
  onIrParaDia?: (grupo: GrupoDiaData) => void;
}

function renderAgenda(overrides: PropsOverrides = {}) {
  const onIrParaDia = overrides.onIrParaDia ?? vi.fn();
  render(
    <AgendaList
      groups={overrides.groups ?? []}
      selectedDate={overrides.selectedDate ?? null}
      todayKey={overrides.todayKey ?? "2026-06-11"}
      proximoDia={overrides.proximoDia ?? null}
      mostrarCta={overrides.mostrarCta ?? false}
      onIrParaDia={onIrParaDia}
    />
  );
  return { onIrParaDia };
}

describe("AgendaList", () => {
  it("mostra estado vazio geral quando não há grupos e nenhum dia selecionado", () => {
    renderAgenda({ groups: [] });
    expect(screen.getByText("Nenhum jogo agendado no momento.")).toBeInTheDocument();
  });

  it("mostra 'Sem jogos hoje' quando o dia selecionado é hoje e não tem jogos", () => {
    const groups = [makeGrupo("2026-06-14", "Brasil")];
    renderAgenda({ groups, selectedDate: "2026-06-11", todayKey: "2026-06-11" });
    expect(screen.getByText("Sem jogos hoje")).toBeInTheDocument();
  });

  it("mostra 'Nenhum jogo neste dia' quando o dia selecionado não é hoje", () => {
    const groups = [makeGrupo("2026-06-11", "México")];
    renderAgenda({ groups, selectedDate: "2026-06-12", todayKey: "2026-06-11" });
    expect(screen.getByText("Nenhum jogo neste dia")).toBeInTheDocument();
    expect(screen.queryByText("México")).not.toBeInTheDocument();
  });

  it("anuncia a data do próximo dia com jogos no estado vazio", () => {
    const proximoDia = makeGrupo("2026-06-14", "Brasil");
    renderAgenda({
      groups: [proximoDia],
      selectedDate: "2026-06-11",
      todayKey: "2026-06-11",
      proximoDia,
    });
    expect(screen.getByText(/domingo, 14 de junho/)).toBeInTheDocument();
  });

  it("mostra o confronto do próximo dia quando ele tem um único jogo", () => {
    const proximoDia = makeGrupo("2026-06-14", "Brasil");
    renderAgenda({
      groups: [proximoDia],
      selectedDate: "2026-06-11",
      todayKey: "2026-06-11",
      proximoDia,
    });
    expect(screen.getByText("Brasil × África do Sul")).toBeInTheDocument();
  });

  it("mostra a contagem de jogos quando o próximo dia tem mais de um", () => {
    const proximoDia: GrupoDiaData = {
      dateKey: "2026-06-14",
      date: new Date("2026-06-14T12:00:00"),
      partidas: [makePartida({ id: "a" }), makePartida({ id: "b" })],
    };
    renderAgenda({
      groups: [proximoDia],
      selectedDate: "2026-06-11",
      todayKey: "2026-06-11",
      proximoDia,
    });
    expect(screen.getByText("2 jogos")).toBeInTheDocument();
  });

  it("chama onIrParaDia com o próximo dia ao clicar em 'Ver esse dia'", async () => {
    const proximoDia = makeGrupo("2026-06-14", "Brasil");
    const { onIrParaDia } = renderAgenda({
      groups: [proximoDia],
      selectedDate: "2026-06-11",
      todayKey: "2026-06-11",
      proximoDia,
    });

    await userEvent.click(screen.getByRole("button", { name: "Ver esse dia" }));

    expect(onIrParaDia).toHaveBeenCalledWith(proximoDia);
  });

  it("não oferece o CTA quando não há próximo dia com jogos (Copa encerrada)", () => {
    const groups = [makeGrupo("2026-06-11", "México")];
    renderAgenda({
      groups,
      selectedDate: "2026-07-20",
      todayKey: "2026-07-20",
      proximoDia: null,
    });
    expect(screen.getByText("Sem jogos hoje")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver esse dia" })).not.toBeInTheDocument();
  });

  it("renderiza todos os grupos quando nenhum dia está selecionado", () => {
    const groups = [makeGrupo("2026-06-11", "México"), makeGrupo("2026-06-12", "Brasil")];
    renderAgenda({ groups, selectedDate: null });
    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
  });

  it("filtra para o grupo do dia selecionado", () => {
    const groups = [makeGrupo("2026-06-11", "México"), makeGrupo("2026-06-12", "Brasil")];
    renderAgenda({ groups, selectedDate: "2026-06-12" });
    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.queryByText("México")).not.toBeInTheDocument();
  });

  it("marca o grupo de hoje com a badge 'Hoje'", () => {
    renderAgenda({ groups: [makeGrupo("2026-06-11", "México")], selectedDate: null });
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("propaga mostrarCta para os jogos (exibe CTA quando logado)", () => {
    renderAgenda({ groups: [makeGrupo("2026-06-11", "México")], mostrarCta: true });
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("não exibe CTA quando mostrarCta é false", () => {
    renderAgenda({ groups: [makeGrupo("2026-06-11", "México")], mostrarCta: false });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
