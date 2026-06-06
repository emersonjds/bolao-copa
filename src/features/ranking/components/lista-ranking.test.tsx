import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListaRanking } from "./lista-ranking";
import type { ItemRanking } from "@/entities/ranking";

function makeItem(
  overrides: Partial<ItemRanking> & { participanteId: string; nome: string }
): ItemRanking {
  return {
    avatarUrl: null,
    pontosTotais: 10,
    jogosPontuados: 3,
    ...overrides,
  };
}

describe("ListaRanking", () => {
  it("retorna null sem ruído visual quando a lista está vazia", () => {
    const { container } = render(<ListaRanking items={[]} meuParticipanteId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza as posições a partir de 4 por padrão", () => {
    const items = [
      makeItem({ participanteId: "id-4", nome: "Quarto" }),
      makeItem({ participanteId: "id-5", nome: "Quinto" }),
    ];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    expect(screen.getByLabelText("4º lugar")).toBeInTheDocument();
    expect(screen.getByLabelText("5º lugar")).toBeInTheDocument();
  });

  it("respeita startPosition customizado para exibir a posição correta", () => {
    const items = [makeItem({ participanteId: "id-7", nome: "Sétimo" })];
    render(<ListaRanking items={items} meuParticipanteId={null} startPosition={7} />);

    expect(screen.getByLabelText("7º lugar")).toBeInTheDocument();
  });

  it("renderiza todos os nomes dos participantes", () => {
    const items = [
      makeItem({ participanteId: "id-4", nome: "Fernanda Lima" }),
      makeItem({ participanteId: "id-5", nome: "Roberto Carlos" }),
    ];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    expect(screen.getByText("Fernanda Lima")).toBeInTheDocument();
    expect(screen.getByText("Roberto Carlos")).toBeInTheDocument();
  });

  it("destaca participante logado com aria-current='true'", () => {
    const items = [
      makeItem({ participanteId: "meu-id", nome: "Eu mesmo" }),
      makeItem({ participanteId: "outro-id", nome: "Outro" }),
    ];
    render(<ListaRanking items={items} meuParticipanteId="meu-id" />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems[0]).toHaveAttribute("aria-current", "true");
    expect(listItems[1]).not.toHaveAttribute("aria-current");
  });

  it("não aplica aria-current em nenhum item quando meuParticipanteId é null", () => {
    const items = [
      makeItem({ participanteId: "id-4", nome: "Alpha" }),
      makeItem({ participanteId: "id-5", nome: "Beta" }),
    ];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    screen.getAllByRole("listitem").forEach((li) => expect(li).not.toHaveAttribute("aria-current"));
  });

  it("não aplica destaque quando meuParticipanteId não bate com nenhum item", () => {
    const items = [makeItem({ participanteId: "id-4", nome: "Alpha" })];
    render(<ListaRanking items={items} meuParticipanteId="id-ausente" />);

    expect(screen.getByRole("listitem")).not.toHaveAttribute("aria-current");
  });

  it("exibe 'jogo pontuado' no singular", () => {
    const items = [makeItem({ participanteId: "id-4", nome: "Singular", jogosPontuados: 1 })];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    expect(screen.getByText("1 jogo pontuado")).toBeInTheDocument();
  });

  it("exibe 'jogos pontuados' no plural", () => {
    const items = [makeItem({ participanteId: "id-4", nome: "Plural", jogosPontuados: 5 })];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    expect(screen.getByText("5 jogos pontuados")).toBeInTheDocument();
  });

  it("exibe 'pt' para 1 ponto total", () => {
    const items = [makeItem({ participanteId: "id-4", nome: "Um Ponto", pontosTotais: 1 })];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    expect(screen.getByText("1 pt")).toBeInTheDocument();
  });

  it("exibe 'pts' para múltiplos pontos totais", () => {
    const items = [makeItem({ participanteId: "id-4", nome: "Muitos Pontos", pontosTotais: 18 })];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    expect(screen.getByText("18 pts")).toBeInTheDocument();
  });

  it("mantém a ordem correta dos participantes na lista", () => {
    const items = [
      makeItem({ participanteId: "id-4", nome: "Quarto" }),
      makeItem({ participanteId: "id-5", nome: "Quinto" }),
      makeItem({ participanteId: "id-6", nome: "Sexto" }),
    ];
    render(<ListaRanking items={items} meuParticipanteId={null} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(3);
    // Verifica que o primeiro item da lista tem a posição 4
    expect(listItems[0]).toHaveTextContent("Quarto");
    expect(listItems[2]).toHaveTextContent("Sexto");
  });
});
