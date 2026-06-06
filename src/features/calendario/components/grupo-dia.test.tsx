import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { GrupoDia } from "./grupo-dia";

function makePartida(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-13T16:00:00",
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

// 13/jun/2026 = sábado.
const dataDia = new Date(2026, 5, 13);

describe("GrupoDia", () => {
  it("renderiza o cabeçalho do dia formatado", () => {
    render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida()]}
        eHoje={false}
        mostrarCta={false}
      />
    );
    expect(screen.getByText("SÁB, 13 JUN")).toBeInTheDocument();
  });

  it("usa o rótulo singular quando há apenas um jogo", () => {
    render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida()]}
        eHoje={false}
        mostrarCta={false}
      />
    );
    expect(screen.getByText("1 jogo")).toBeInTheDocument();
  });

  it("usa o rótulo plural quando há vários jogos", () => {
    render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida({ id: "a" }), makePartida({ id: "b" }), makePartida({ id: "c" })]}
        eHoje={false}
        mostrarCta={false}
      />
    );
    expect(screen.getByText("3 jogos")).toBeInTheDocument();
  });

  it("mostra a badge 'Hoje' quando eHoje é true", () => {
    render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida()]}
        eHoje
        mostrarCta={false}
      />
    );
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("não mostra a badge 'Hoje' quando eHoje é false", () => {
    render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida()]}
        eHoje={false}
        mostrarCta={false}
      />
    );
    expect(screen.queryByText("Hoje")).not.toBeInTheDocument();
  });

  it("renderiza um item por partida", () => {
    const { container } = render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida({ id: "a" }), makePartida({ id: "b" })]}
        eHoje={false}
        mostrarCta={false}
      />
    );
    expect(container.querySelectorAll("ul > li")).toHaveLength(2);
  });

  it("associa a section ao cabeçalho via aria-labelledby", () => {
    const { container } = render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida()]}
        eHoje={false}
        mostrarCta={false}
      />
    );
    const section = container.querySelector("section");
    expect(section).toHaveAttribute("aria-labelledby", "header-dia-2026-06-13");
    expect(container.querySelector("#header-dia-2026-06-13")).toBeInTheDocument();
  });

  it("propaga mostrarCta para os itens (exibe CTA em jogos agendados)", () => {
    render(
      <GrupoDia
        dateKey="2026-06-13"
        date={dataDia}
        partidas={[makePartida({ status: "agendada" })]}
        eHoje={false}
        mostrarCta
      />
    );
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
