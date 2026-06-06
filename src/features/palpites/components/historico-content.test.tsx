import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import { HistoricoContent } from "./historico-content";

vi.mock("@/shared/ui/flag-icon", () => ({
  FlagIcon: ({ nome }: { nome: string }) => <span data-testid="bandeira">{nome}</span>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Partida encerrada (travada) com placar oficial. */
const partidaTravada: Partida = {
  id: "part-1",
  fase: "grupos",
  grupo: "A",
  dataHora: "2026-06-01T19:00:00.000Z", // passado — travada
  estadio: "Estadio X",
  status: "encerrada",
  mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
  visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
  golsMandante: 2,
  golsVisitante: 1,
  vencedorPenaltis: null,
  mandanteLabel: null,
  visitanteLabel: null,
};

/** Partida aberta no futuro — não deve aparecer no histórico. */
const partidaAberta: Partida = {
  ...partidaTravada,
  id: "part-2",
  dataHora: "2099-06-20T19:00:00.000Z",
  status: "agendada",
};

const palpite: Palpite = {
  id: "palp-1",
  participanteId: "part-id-1",
  partidaId: "part-1",
  golsMandante: 2,
  golsVisitante: 0,
  pontos: 3,
};

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("HistoricoContent", () => {
  it("exibe o estado vazio quando não há partidas travadas", () => {
    render(<HistoricoContent partidas={[partidaAberta]} meusPalpites={[]} />);

    expect(screen.getByText(/nenhum jogo encerrado ainda/i)).toBeInTheDocument();
  });

  it("exibe o resumo de pontos totais quando há partidas travadas", () => {
    render(<HistoricoContent partidas={[partidaTravada]} meusPalpites={[palpite]} />);

    // Banner com pontos totais
    expect(screen.getByText(/3 pontos/i)).toBeInTheDocument();
    expect(screen.getByText(/1 jogo apurado/i)).toBeInTheDocument();
  });

  it("usa plural 'pontos' quando totalPontos > 1", () => {
    const palpite2: Palpite = { ...palpite, pontos: 5 };
    render(<HistoricoContent partidas={[partidaTravada]} meusPalpites={[palpite2]} />);

    expect(screen.getByText(/5 pontos/i)).toBeInTheDocument();
  });

  it("usa singular 'ponto' quando totalPontos é exatamente 1", () => {
    const palpite1: Palpite = { ...palpite, pontos: 1 };
    render(<HistoricoContent partidas={[partidaTravada]} meusPalpites={[palpite1]} />);

    // Banner no singular: "1 ponto" (não "1 pontos")
    expect(screen.getByText(/^1 ponto$/)).toBeInTheDocument();
  });

  it("exibe o CardHistorico de cada partida travada agrupado por data", () => {
    const partida2: Partida = {
      ...partidaTravada,
      id: "part-3",
      dataHora: "2026-06-02T19:00:00.000Z",
    };

    render(<HistoricoContent partidas={[partidaTravada, partida2]} meusPalpites={[]} />);

    // Devem aparecer seções de datas distintas
    const secoes = screen.getAllByRole("region");
    // Cada seção corresponde a um grupo de data
    expect(secoes.length).toBeGreaterThanOrEqual(2);
  });

  it("não exibe partidas abertas (futuras) no histórico", () => {
    render(<HistoricoContent partidas={[partidaTravada, partidaAberta]} meusPalpites={[]} />);

    // Estado não-vazio: há uma partida travada
    expect(screen.queryByText(/nenhum jogo encerrado ainda/i)).not.toBeInTheDocument();
    // Mas o banner de pontos mostra 0 apurados (palpite sem pontos)
    expect(screen.getByText(/0 pontos/i)).toBeInTheDocument();
  });
});
