import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Podio } from "./podio";
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

describe("Podio", () => {
  it("não renderiza nada quando o top3 está vazio", () => {
    const { container } = render(<Podio top3={[]} meuParticipanteId={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza somente o líder com aria-label 'Pódio' quando há 1 participante", () => {
    const primeiro = makeItem({ participanteId: "id-1", nome: "Líder", pontosTotais: 20 });
    render(<Podio top3={[primeiro]} meuParticipanteId={null} />);

    expect(screen.getByRole("region", { name: "Pódio" })).toBeInTheDocument();
    // Segundo e terceiro pedestais não existem
    expect(screen.queryByRole("region", { name: "Pódio — top 3" })).not.toBeInTheDocument();
  });

  it("renderiza top-3 com aria-label 'Pódio — top 3' quando há 2 ou mais participantes", () => {
    const items = [
      makeItem({ participanteId: "id-1", nome: "Primeiro" }),
      makeItem({ participanteId: "id-2", nome: "Segundo" }),
    ];
    render(<Podio top3={items} meuParticipanteId={null} />);

    expect(screen.getByRole("region", { name: "Pódio — top 3" })).toBeInTheDocument();
  });

  it("renderiza os três participantes do top-3 com seus nomes", () => {
    const items = [
      makeItem({ participanteId: "id-1", nome: "Alfa" }),
      makeItem({ participanteId: "id-2", nome: "Beta" }),
      makeItem({ participanteId: "id-3", nome: "Gama" }),
    ];
    render(<Podio top3={items} meuParticipanteId={null} />);

    expect(screen.getByText("Alfa")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gama")).toBeInTheDocument();
  });

  it("exibe 'Você' quando o participante logado está em 1º lugar", () => {
    const meuItem = makeItem({ participanteId: "meu-id", nome: "João Silva" });
    render(<Podio top3={[meuItem]} meuParticipanteId="meu-id" />);

    expect(screen.getByText("Você")).toBeInTheDocument();
    // O nome completo não deve aparecer (substituído por "Você")
    expect(screen.queryByText("João")).not.toBeInTheDocument();
  });

  it("exibe 'Você' quando o participante logado está em 2º lugar", () => {
    const items = [
      makeItem({ participanteId: "id-1", nome: "Primeiro" }),
      makeItem({ participanteId: "meu-id", nome: "Ana Paula" }),
    ];
    render(<Podio top3={items} meuParticipanteId="meu-id" />);

    expect(screen.getByText("Você")).toBeInTheDocument();
  });

  it("exibe apenas o primeiro nome para participante não logado", () => {
    const item = makeItem({ participanteId: "id-1", nome: "Carlos Drummond Andrade" });
    render(<Podio top3={[item]} meuParticipanteId={null} />);

    expect(screen.getByText("Carlos")).toBeInTheDocument();
    expect(screen.queryByText("Carlos Drummond Andrade")).not.toBeInTheDocument();
  });

  it("exibe nome completo quando o nome tem apenas uma palavra", () => {
    const item = makeItem({ participanteId: "id-1", nome: "Pelé" });
    render(<Podio top3={[item]} meuParticipanteId={null} />);

    expect(screen.getByText("Pelé")).toBeInTheDocument();
  });

  it("exibe 'pt' para 1 ponto e 'pts' para múltiplos pontos", () => {
    const items = [
      makeItem({ participanteId: "id-1", nome: "Um", pontosTotais: 1 }),
      makeItem({ participanteId: "id-2", nome: "Dois", pontosTotais: 15 }),
    ];
    render(<Podio top3={items} meuParticipanteId={null} />);

    expect(screen.getByText("1 pt")).toBeInTheDocument();
    expect(screen.getByText("15 pts")).toBeInTheDocument();
  });

  it("não renderiza o 3º pedestal quando há apenas 2 participantes", () => {
    const items = [
      makeItem({ participanteId: "id-1", nome: "Primeiro" }),
      makeItem({ participanteId: "id-2", nome: "Segundo" }),
    ];
    render(<Podio top3={items} meuParticipanteId={null} />);

    expect(screen.getByText("Primeiro")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
    // Apenas dois nomes visíveis — nenhum terceiro
    expect(screen.getAllByTitle(/./)).toHaveLength(2);
  });

  it("não exibe 'Você' quando meuParticipanteId não bate com nenhum do top-3", () => {
    const items = [
      makeItem({ participanteId: "id-1", nome: "Alpha" }),
      makeItem({ participanteId: "id-2", nome: "Beta" }),
      makeItem({ participanteId: "id-3", nome: "Gamma" }),
    ];
    render(<Podio top3={items} meuParticipanteId="id-fora" />);

    expect(screen.queryByText("Você")).not.toBeInTheDocument();
  });
});
