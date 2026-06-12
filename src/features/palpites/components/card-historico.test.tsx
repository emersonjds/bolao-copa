import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import type { ItemHistorico } from "../lib/derivar-historico";
import { CardHistorico } from "./card-historico";

vi.mock("@/shared/ui/flag-icon", () => ({
  FlagIcon: ({ nome }: { nome: string }) => <span data-testid="bandeira">{nome}</span>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const partida: Partida = {
  id: "part-1",
  fase: "grupos",
  grupo: "A",
  dataHora: "2026-06-11T19:00:00.000Z",
  janelaInicio: "2020-01-01T03:00:00Z",
  estadio: "Estadio X",
  status: "encerrada",
  mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
  visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
  golsMandante: null,
  golsVisitante: null,
  vencedorPenaltis: null,
  mandanteLabel: null,
  visitanteLabel: null,
};

const palpite: Palpite = {
  id: "palp-1",
  participanteId: "part-id-1",
  partidaId: "part-1",
  golsMandante: 2,
  golsVisitante: 0,
  pontos: null,
};

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("CardHistorico", () => {
  it("exibe o placar do palpite quando o participante apostou", () => {
    const item: ItemHistorico = { partida, palpite, pontos: null };

    render(<CardHistorico item={item} />);

    // Confirma que o label "Seu palpite" está visível e "Sem palpite" não
    expect(screen.getByText(/seu palpite/i)).toBeInTheDocument();
    expect(screen.queryByText(/sem palpite/i)).not.toBeInTheDocument();

    const article = screen.getByRole("article");
    expect(article.textContent).toContain("2");
    expect(article.textContent).toContain("0");
  });

  it("exibe 'Sem palpite' em itálico quando o participante não apostou", () => {
    const item: ItemHistorico = { partida, palpite: null, pontos: null };

    render(<CardHistorico item={item} />);

    expect(screen.getByText(/sem palpite/i)).toBeInTheDocument();
  });

  it("exibe 'A apurar' quando a partida não tem placar oficial", () => {
    const item: ItemHistorico = { partida, palpite: null, pontos: null };

    render(<CardHistorico item={item} />);

    expect(screen.getByText(/a apurar/i)).toBeInTheDocument();
  });

  it("exibe o resultado oficial quando a partida tem placar", () => {
    const comPlacar: Partida = {
      ...partida,
      golsMandante: 3,
      golsVisitante: 1,
    };
    const item: ItemHistorico = { partida: comPlacar, palpite, pontos: null };

    render(<CardHistorico item={item} />);

    expect(screen.getByText(/resultado oficial.*3.*1/i)).toBeInTheDocument();
  });

  it("exibe a pontuação quando pontos não é null", () => {
    const comPlacar: Partida = {
      ...partida,
      golsMandante: 2,
      golsVisitante: 0,
    };
    const item: ItemHistorico = { partida: comPlacar, palpite, pontos: 3 };

    render(<CardHistorico item={item} />);

    expect(screen.getByText(/3 pts/i)).toBeInTheDocument();
  });

  it("usa singular 'pt' quando pontuação é 1", () => {
    const comPlacar: Partida = {
      ...partida,
      golsMandante: 1,
      golsVisitante: 0,
    };
    const item: ItemHistorico = { partida: comPlacar, palpite, pontos: 1 };

    render(<CardHistorico item={item} />);

    expect(screen.getByText(/1 pt\b/)).toBeInTheDocument();
  });

  it("não exibe badge de pontuação quando pontos é null", () => {
    const item: ItemHistorico = { partida, palpite, pontos: null };

    render(<CardHistorico item={item} />);

    expect(screen.queryByText(/\d+ pts?/)).not.toBeInTheDocument();
  });

  it("usa o rótulo da fase no badge quando a partida não tem grupo (mata-mata)", () => {
    const partidaMataMata: Partida = {
      ...partida,
      fase: "oitavas",
      grupo: null,
    };
    const item: ItemHistorico = { partida: partidaMataMata, palpite, pontos: null };

    render(<CardHistorico item={item} />);

    // grupo nulo → cai no FASE_LABEL["oitavas"] = "Oitavas"
    expect(screen.getByText("Oitavas")).toBeInTheDocument();
    expect(screen.queryByText(/grupo/i)).not.toBeInTheDocument();
  });

  it("usa a própria string da fase como badge quando não está no mapeamento FASE_LABEL (linha 36 fallback ??)", () => {
    // Cobre o branch `FASE_LABEL[partida.fase] ?? partida.fase` quando a fase
    // não existe no mapa e grupo é null — o fallback retorna a string crua.
    const partidaFaseDesconhecida: Partida = {
      ...partida,
      fase: "preliminar" as unknown as Partida["fase"],
      grupo: null,
    };
    const item: ItemHistorico = { partida: partidaFaseDesconhecida, palpite: null, pontos: null };

    render(<CardHistorico item={item} />);

    expect(screen.getByText("preliminar")).toBeInTheDocument();
  });
});
