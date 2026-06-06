import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import type { GrupoDiaData } from "../lib";
import { AgendaList } from "./agenda-list";

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T16:00:00",
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

describe("AgendaList", () => {
  it("mostra estado vazio geral quando não há grupos e nenhum dia selecionado", () => {
    render(<AgendaList groups={[]} selectedDate={null} todayKey="2026-06-11" mostrarCta={false} />);
    expect(screen.getByText("Nenhum jogo agendado no momento.")).toBeInTheDocument();
  });

  it("mostra 'Nenhum jogo neste dia.' quando o dia selecionado não tem grupos", () => {
    const groups = [makeGrupo("2026-06-11", "México")];
    render(
      <AgendaList
        groups={groups}
        selectedDate="2026-06-12"
        todayKey="2026-06-11"
        mostrarCta={false}
      />
    );
    expect(screen.getByText("Nenhum jogo neste dia.")).toBeInTheDocument();
    expect(screen.queryByText("México")).not.toBeInTheDocument();
  });

  it("renderiza todos os grupos quando nenhum dia está selecionado", () => {
    const groups = [makeGrupo("2026-06-11", "México"), makeGrupo("2026-06-12", "Brasil")];
    render(
      <AgendaList groups={groups} selectedDate={null} todayKey="2026-06-11" mostrarCta={false} />
    );
    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.getByText("Brasil")).toBeInTheDocument();
  });

  it("filtra para o grupo do dia selecionado", () => {
    const groups = [makeGrupo("2026-06-11", "México"), makeGrupo("2026-06-12", "Brasil")];
    render(
      <AgendaList
        groups={groups}
        selectedDate="2026-06-12"
        todayKey="2026-06-11"
        mostrarCta={false}
      />
    );
    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.queryByText("México")).not.toBeInTheDocument();
  });

  it("marca o grupo de hoje com a badge 'Hoje'", () => {
    const groups = [makeGrupo("2026-06-11", "México")];
    render(
      <AgendaList groups={groups} selectedDate={null} todayKey="2026-06-11" mostrarCta={false} />
    );
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("propaga mostrarCta para os jogos (exibe CTA quando logado)", () => {
    const groups = [makeGrupo("2026-06-11", "México")];
    render(<AgendaList groups={groups} selectedDate={null} todayKey="2026-06-11" mostrarCta />);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("não exibe CTA quando mostrarCta é false", () => {
    const groups = [makeGrupo("2026-06-11", "México")];
    render(
      <AgendaList groups={groups} selectedDate={null} todayKey="2026-06-11" mostrarCta={false} />
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
