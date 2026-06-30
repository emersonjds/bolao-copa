import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  janelaInicio: "2020-01-01T03:00:00Z",
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

    const secoes = screen.getAllByRole("region");
    expect(secoes.length).toBeGreaterThanOrEqual(2);
  });

  it("não exibe partidas abertas (futuras) no histórico", () => {
    render(<HistoricoContent partidas={[partidaTravada, partidaAberta]} meusPalpites={[]} />);

    // Estado não-vazio: há uma partida travada
    expect(screen.queryByText(/nenhum jogo encerrado ainda/i)).not.toBeInTheDocument();
    // Mas o banner de pontos mostra 0 apurados (palpite sem pontos)
    expect(screen.getByText(/0 pontos/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Paginação progressiva
  // ---------------------------------------------------------------------------

  /** Gera N partidas encerradas com IDs únicos, distribuídas em datas passadas. */
  function gerarPartidasEncerradas(quantidade: number): Partida[] {
    return Array.from(
      { length: quantidade },
      (_, i): Partida => ({
        ...partidaTravada,
        id: `part-pag-${i}`,
        // Cicla entre 2026-06-01 e 2026-06-06 (todas no passado)
        dataHora: `2026-06-${String((i % 6) + 1).padStart(2, "0")}T19:00:00.000Z`,
      })
    );
  }

  it("renderiza os primeiros 20 itens e exibe botão 'Ver mais jogos' quando há mais de 20 partidas", () => {
    render(<HistoricoContent partidas={gerarPartidasEncerradas(25)} meusPalpites={[]} />);

    // Cada card exibe 2 bandeiras (mandante + visitante); 20 cards = 40 bandeiras
    expect(screen.getAllByTestId("bandeira")).toHaveLength(40);
    expect(screen.getByRole("button", { name: /ver mais jogos/i })).toBeInTheDocument();
  });

  it("exibe todos os itens e remove o botão após clicar em 'Ver mais jogos'", () => {
    render(<HistoricoContent partidas={gerarPartidasEncerradas(25)} meusPalpites={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /ver mais jogos/i }));

    // Todos os 25 cards visíveis = 50 bandeiras
    expect(screen.getAllByTestId("bandeira")).toHaveLength(50);
    expect(screen.queryByRole("button", { name: /ver mais jogos/i })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Cobertura do callback do .map() de grupos (linhas 94, 103-105)
  // ---------------------------------------------------------------------------

  it("agrupa duas partidas da mesma data UTC em uma única seção com header de data", () => {
    // Duas partidas em "2026-06-01": primeira cria o grupo (?? [] cria novo array),
    // segunda encontra o grupo existente (?? [] NÃO ativado — left side retorna array).
    // Garante que o span com formatarData (linha 94) e o fechamento da section
    // (linhas 103-105) são executados pelo map callback.
    const partida2: Partida = {
      ...partidaTravada,
      id: "part-mesmo-dia",
      dataHora: "2026-06-01T22:00:00.000Z", // mesma data UTC, hora diferente
    };

    render(<HistoricoContent partidas={[partidaTravada, partida2]} meusPalpites={[]} />);

    // Uma única seção para "2026-06-01"
    const secoes = screen.getAllByRole("region");
    expect(secoes).toHaveLength(1);

    // Dois cards dentro da seção = 4 bandeiras (2 por card)
    expect(screen.getAllByTestId("bandeira")).toHaveLength(4);
  });

  it("exibe o cabeçalho de data formatado pela função formatarData dentro do section header", () => {
    // Verifica que o span com o resultado de formatarData (linha 94 do JSX) está
    // no DOM — cobrindo explicitamente o caminho do map callback que inclui
    // capitalize + formatarData + fechamento da section.
    render(<HistoricoContent partidas={[partidaTravada]} meusPalpites={[]} />);

    // A seção deve ter um label com o id `historico-data-YYYY-MM-DD`.
    // O span irmão contém o texto do cabeçalho gerado por formatarData.
    const secao = screen.getByRole("region");
    expect(secao).toBeInTheDocument();
    expect(document.getElementById("historico-data-2026-06-01")).toBeInTheDocument();
  });
});
