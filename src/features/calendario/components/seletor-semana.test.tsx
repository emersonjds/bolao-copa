import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeletorSemana } from "./seletor-semana";

// Semana de domingo 07/jun a sábado 13/jun de 2026.
const weekDays = Array.from({ length: 7 }, (_, i) => new Date(2026, 5, 7 + i));

interface Overrides {
  selectedDate?: string | null;
  todayKey?: string;
  daysWithGames?: ReadonlySet<string>;
  onSelectDay?: (dateKey: string) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}

function renderSeletor(overrides: Overrides = {}) {
  const props = {
    weekDays,
    selectedDate: overrides.selectedDate ?? null,
    todayKey: overrides.todayKey ?? "2026-06-10",
    daysWithGames: overrides.daysWithGames ?? new Set<string>(["2026-06-07", "2026-06-11"]),
    onSelectDay: overrides.onSelectDay ?? vi.fn(),
    onPrevWeek: overrides.onPrevWeek ?? vi.fn(),
    onNextWeek: overrides.onNextWeek ?? vi.fn(),
  };
  render(<SeletorSemana {...props} />);
  return props;
}

function getDayButtons(): HTMLElement[] {
  const grupo = screen.getByRole("group", { name: "Selecionar dia" });
  return within(grupo).getAllByRole("button");
}

describe("SeletorSemana", () => {
  it("renderiza um botão para cada um dos 7 dias", () => {
    renderSeletor();
    expect(getDayButtons()).toHaveLength(7);
  });

  it("dispara onSelectDay com a dateKey correta ao clicar em um dia", async () => {
    const onSelectDay = vi.fn();
    renderSeletor({ onSelectDay });
    await userEvent.click(getDayButtons()[0]); // 07/jun
    expect(onSelectDay).toHaveBeenCalledExactlyOnceWith("2026-06-07");
  });

  it("marca o dia selecionado com aria-pressed true e os demais com false", () => {
    renderSeletor({ selectedDate: "2026-06-11" });
    const botoes = getDayButtons();
    expect(botoes[4]).toHaveAttribute("aria-pressed", "true"); // 11/jun
    expect(botoes[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("marca o dia de hoje com aria-current=date", () => {
    renderSeletor({ todayKey: "2026-06-10" });
    const botoes = getDayButtons();
    expect(botoes[3]).toHaveAttribute("aria-current", "date"); // 10/jun
    expect(botoes[0]).not.toHaveAttribute("aria-current");
  });

  it("exibe o ponto indicador apenas nos dias com jogos", () => {
    renderSeletor({ daysWithGames: new Set<string>(["2026-06-07"]) });
    const botoes = getDayButtons();
    const pontoComJogo = botoes[0].querySelectorAll("span")[2];
    const pontoSemJogo = botoes[1].querySelectorAll("span")[2];
    expect(pontoComJogo.className).toContain("bg-brand-400");
    expect(pontoSemJogo.className).toContain("bg-transparent");
  });

  it("dispara onPrevWeek ao clicar em 'Semana anterior'", async () => {
    const onPrevWeek = vi.fn();
    renderSeletor({ onPrevWeek });
    await userEvent.click(screen.getByRole("button", { name: "Semana anterior" }));
    expect(onPrevWeek).toHaveBeenCalledOnce();
  });

  it("dispara onNextWeek ao clicar em 'Próxima semana'", async () => {
    const onNextWeek = vi.fn();
    renderSeletor({ onNextWeek });
    await userEvent.click(screen.getByRole("button", { name: "Próxima semana" }));
    expect(onNextWeek).toHaveBeenCalledOnce();
  });
});
