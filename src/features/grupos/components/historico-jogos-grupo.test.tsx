import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Partida } from "@/entities/partida";
import { HistoricoJogosGrupo } from "./historico-jogos-grupo";

function makeJogo(overrides: Partial<Partida> = {}): Partida {
  return {
    id: "j1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-15T19:00:00.000Z",
    janelaInicio: "2026-06-15T03:00:00.000Z",
    estadio: "Estádio Azteca",
    status: "agendada",
    mandante: { id: "bra", nome: "Brasil", codigo: "BRA" },
    visitante: { id: "arg", nome: "Argentina", codigo: "ARG" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...overrides,
  };
}

describe("HistoricoJogosGrupo", () => {
  it("retorna null quando não há jogos", () => {
    const { container } = render(<HistoricoJogosGrupo grupo="A" jogos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renderiza o título da seção com a letra do grupo", () => {
    render(<HistoricoJogosGrupo grupo="B" jogos={[makeJogo()]} />);
    expect(screen.getByRole("region", { name: "Jogos do grupo B" })).toBeInTheDocument();
    expect(screen.getByText("Jogos do Grupo B")).toBeInTheDocument();
  });

  it("renderiza um item por jogo com os nomes das seleções", () => {
    const jogos = [
      makeJogo({ id: "j1", mandante: { id: "bra", nome: "Brasil", codigo: "BRA" } }),
      makeJogo({ id: "j2", mandante: { id: "mex", nome: "México", codigo: "MEX" } }),
    ];
    render(<HistoricoJogosGrupo grupo="A" jogos={jogos} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Brasil")).toBeInTheDocument();
    expect(screen.getByText("México")).toBeInTheDocument();
  });

  it("exibe o placar quando o jogo está encerrado com gols", () => {
    render(
      <HistoricoJogosGrupo
        grupo="A"
        jogos={[makeJogo({ status: "encerrada", golsMandante: 2, golsVisitante: 1 })]}
      />
    );
    expect(screen.getByText("2 × 1")).toBeInTheDocument();
  });

  it("exibe '×' como separador quando não há placar", () => {
    render(
      <HistoricoJogosGrupo
        grupo="A"
        jogos={[makeJogo({ status: "agendada", golsMandante: null, golsVisitante: null })]}
      />
    );
    expect(screen.getByText("×")).toBeInTheDocument();
  });

  it("exibe o badge de status encerrada em vez da data", () => {
    render(
      <HistoricoJogosGrupo
        grupo="A"
        jogos={[makeJogo({ status: "encerrada", golsMandante: 0, golsVisitante: 0 })]}
      />
    );
    // derivarStatusBadge retorna "ENCERRADO" para encerrada
    expect(screen.getByText("ENCERRADO")).toBeInTheDocument();
  });

  it("exibe a data formatada para jogo agendado", () => {
    render(
      <HistoricoJogosGrupo
        grupo="A"
        // 2026-06-15T19:00Z = 16h em São Paulo (UTC-3)
        jogos={[makeJogo({ status: "agendada", dataHora: "2026-06-15T19:00:00.000Z" })]}
      />
    );
    // deve conter o horário formatado em pt-BR (16:00)
    const texto = screen.getAllByText(/jun/i);
    expect(texto.length).toBeGreaterThan(0);
  });

  it("ordena encerrados antes dos agendados", () => {
    const jogos = [
      makeJogo({
        id: "agenda",
        status: "agendada",
        dataHora: "2026-06-14T16:00:00.000Z",
        mandante: { id: "mex", nome: "México", codigo: "MEX" },
        visitante: { id: "rsa", nome: "África do Sul", codigo: "RSA" },
      }),
      makeJogo({
        id: "encerrado",
        status: "encerrada",
        dataHora: "2026-06-13T16:00:00.000Z",
        golsMandante: 1,
        golsVisitante: 0,
        mandante: { id: "bra", nome: "Brasil", codigo: "BRA" },
        visitante: { id: "arg", nome: "Argentina", codigo: "ARG" },
      }),
    ];

    render(<HistoricoJogosGrupo grupo="A" jogos={jogos} />);
    const itens = screen.getAllByRole("listitem");
    // encerrado deve aparecer primeiro
    expect(itens[0]).toHaveTextContent("Brasil");
    expect(itens[1]).toHaveTextContent("México");
  });

  it("aplica destaque visual em jogo ao-vivo", () => {
    const { container } = render(
      <HistoricoJogosGrupo
        grupo="A"
        jogos={[makeJogo({ status: "ao-vivo", golsMandante: 1, golsVisitante: 0 })]}
      />
    );
    const item = container.querySelector("li");
    expect(item?.className).toContain("border-destructive");
  });

  it("aplica opacidade reduzida em jogo encerrado", () => {
    const { container } = render(
      <HistoricoJogosGrupo
        grupo="A"
        jogos={[makeJogo({ status: "encerrada", golsMandante: 0, golsVisitante: 0 })]}
      />
    );
    const item = container.querySelector("li");
    expect(item?.className).toContain("opacity-80");
  });

  it("ordena dois encerrados pelo mais recente primeiro", () => {
    const jogos = [
      makeJogo({
        id: "antigo",
        status: "encerrada",
        dataHora: "2026-06-12T16:00:00.000Z",
        golsMandante: 0,
        golsVisitante: 0,
        mandante: { id: "bra", nome: "Brasil", codigo: "BRA" },
        visitante: { id: "arg", nome: "Argentina", codigo: "ARG" },
      }),
      makeJogo({
        id: "recente",
        status: "encerrada",
        dataHora: "2026-06-14T16:00:00.000Z",
        golsMandante: 1,
        golsVisitante: 0,
        mandante: { id: "mex", nome: "México", codigo: "MEX" },
        visitante: { id: "rsa", nome: "África do Sul", codigo: "RSA" },
      }),
    ];

    render(<HistoricoJogosGrupo grupo="A" jogos={jogos} />);
    const itens = screen.getAllByRole("listitem");
    // encerrado mais recente (jun 14) deve vir antes do mais antigo (jun 12)
    expect(itens[0]).toHaveTextContent("México");
    expect(itens[1]).toHaveTextContent("Brasil");
  });

  it("ordena corretamente com mistura: encerrado, agendado, agendado", () => {
    // três elementos forçam o comparador a avaliar pares agendado×encerrado
    const jogos = [
      makeJogo({
        id: "enc",
        status: "encerrada",
        dataHora: "2026-06-10T16:00:00.000Z",
        golsMandante: 1,
        golsVisitante: 0,
        mandante: { id: "bra", nome: "Brasil", codigo: "BRA" },
        visitante: { id: "arg", nome: "Argentina", codigo: "ARG" },
      }),
      makeJogo({
        id: "ag1",
        status: "agendada",
        dataHora: "2026-06-17T16:00:00.000Z",
        mandante: { id: "mex", nome: "México", codigo: "MEX" },
        visitante: { id: "rsa", nome: "África do Sul", codigo: "RSA" },
      }),
      makeJogo({
        id: "ag2",
        status: "agendada",
        dataHora: "2026-06-20T16:00:00.000Z",
        mandante: { id: "uru", nome: "Uruguai", codigo: "URU" },
        visitante: { id: "por", nome: "Portugal", codigo: "POR" },
      }),
    ];

    render(<HistoricoJogosGrupo grupo="A" jogos={jogos} />);
    const itens = screen.getAllByRole("listitem");
    expect(itens).toHaveLength(3);
    // encerrado sempre primeiro
    expect(itens[0]).toHaveTextContent("Brasil");
    // agendados em ordem cronológica
    expect(itens[1]).toHaveTextContent("México");
    expect(itens[2]).toHaveTextContent("Uruguai");
  });
});
