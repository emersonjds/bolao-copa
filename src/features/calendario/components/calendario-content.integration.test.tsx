import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { server } from "@/test/msw/server";
import { restList } from "@/test/msw/handlers";
import { partidaDb } from "@/test/fixtures";
import { CalendarioContent } from "./calendario-content";

/**
 * Integração da Agenda contra o Supabase mockado (MSW): usa o usePartidas real,
 * exercitando fetcher + mapeamento + agrupamento por dia + estado vazio.
 */

function pad(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** ISO local (sem Z) do dia de hoje + `dias`, às 16h. */
function dataHoraEm(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T16:00:00`;
}

function partidaEm(dias: number, id: string) {
  return { ...partidaDb, id, data_hora: dataHoraEm(dias) };
}

describe("Agenda da Copa (integração com Supabase mockado)", () => {
  it("abre no dia de hoje quando há jogo hoje", async () => {
    server.use(restList("partidas", [partidaEm(0, "hoje"), partidaEm(2, "depois")]));

    renderWithProviders(<CalendarioContent />);

    await waitFor(() => expect(screen.getAllByText("México").length).toBe(1));
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("mostra 'Sem jogos hoje' e o próximo dia com jogos quando hoje está vazio", async () => {
    server.use(restList("partidas", [partidaEm(2, "daqui-2-dias")]));

    renderWithProviders(<CalendarioContent />);

    expect(await screen.findByText("Sem jogos hoje")).toBeInTheDocument();
    expect(screen.getByText(/Bola rola em 2 dias/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver esse dia/ })).toBeInTheDocument();
  });

  it("'Ver esse dia' abre a agenda do próximo dia com jogos", async () => {
    server.use(restList("partidas", [partidaEm(2, "daqui-2-dias")]));

    renderWithProviders(<CalendarioContent />);

    await userEvent.click(await screen.findByRole("button", { name: /Ver esse dia/ }));

    expect(screen.getByText("México")).toBeInTheDocument();
    expect(screen.queryByText("Sem jogos hoje")).not.toBeInTheDocument();
  });

  it("mostra o estado vazio geral quando o Supabase não devolve partidas", async () => {
    server.use(restList("partidas", []));

    renderWithProviders(<CalendarioContent />);

    expect(await screen.findByText("Nenhum jogo agendado no momento.")).toBeInTheDocument();
  });
});
