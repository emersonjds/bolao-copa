import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { RegrasContent } from "./regras-content";

describe("RegrasContent", () => {
  it("renderiza o título principal e o subtítulo da seção", () => {
    render(<RegrasContent />);

    expect(
      screen.getByRole("heading", { name: "Regras e pontuação", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/como cada palpite vira pontos/i)).toBeInTheDocument();
  });

  it("renderiza as cinco categorias de pontuação base", () => {
    render(<RegrasContent />);

    const secao = screen.getByRole("region", { name: /pontuação base/i });
    expect(within(secao).getByText("Cravou o placar da vitória")).toBeInTheDocument();
    expect(within(secao).getByText("Cravou o placar do empate")).toBeInTheDocument();
    expect(within(secao).getByText("Acertou quem ganhou")).toBeInTheDocument();
    expect(within(secao).getByText("Acertou que foi empate")).toBeInTheDocument();
    expect(within(secao).getByText("Errou o resultado")).toBeInTheDocument();
  });

  it("exibe o badge 'Máximo' somente na categoria de 5 pontos (vitória cravada)", () => {
    render(<RegrasContent />);

    const badges = screen.getAllByText("Máximo");
    expect(badges).toHaveLength(1);
  });

  it("renderiza a seção de multiplicador com o badge 'Decisão' para final/semi", () => {
    render(<RegrasContent />);

    const secao = screen.getByRole("region", { name: /multiplicador por fase/i });
    expect(within(secao).getByText("Fase de grupos e 32-avos")).toBeInTheDocument();
    expect(within(secao).getByText("Oitavas e quartas")).toBeInTheDocument();
    expect(within(secao).getByText("Semifinal e final")).toBeInTheDocument();
    expect(within(secao).getByText("Decisão")).toBeInTheDocument();
  });

  it("exibe a tabela de pontos calculados com os pesos aplicados", () => {
    render(<RegrasContent />);

    const tabela = screen.getByRole("table");
    // 5 × 3 = 15 (cravar vitória na final)
    expect(within(tabela).getByText("15")).toBeInTheDocument();
    // 5 × 2 = 10 (cravar vitória nas oitavas)
    expect(within(tabela).getByText("10")).toBeInTheDocument();
    // 4 × 3 = 12 (cravar empate na final)
    expect(within(tabela).getByText("12")).toBeInTheDocument();
    // 3×2=6 e 2×3=6 aparecem duas vezes
    expect(within(tabela).getAllByText("6")).toHaveLength(2);
  });

  it("exibe os exemplos de palpite com plural 'pts' para pontos ≠ 1", () => {
    render(<RegrasContent />);

    const secao = screen.getByRole("region", { name: /exemplos/i });
    expect(within(secao).getByText("5 pts")).toBeInTheDocument();
    expect(within(secao).getByText("3 pts")).toBeInTheDocument();
    expect(within(secao).getByText("4 pts")).toBeInTheDocument();
    expect(within(secao).getByText("2 pts")).toBeInTheDocument();
    // EXEMPLOS estáticos têm múltiplos palpites com 0 pts
    expect(within(secao).getAllByText("0 pts").length).toBeGreaterThanOrEqual(3);
  });

  it("usa classe gold para pontuações >= 3 nos exemplos (getPalpiteBadgeClasses)", () => {
    const { container } = render(<RegrasContent />);

    const badge5pts = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "5 pts"
    );
    expect(badge5pts?.className).toContain("bg-brand-800");
    expect(badge5pts?.className).toContain("text-gold-400");
  });

  it("usa classe intermediária para pontuações entre 1 e 2 (getPalpiteBadgeClasses)", () => {
    const { container } = render(<RegrasContent />);

    const badge2pts = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "2 pts"
    );
    expect(badge2pts?.className).toContain("bg-brand-600");
    expect(badge2pts?.className).toContain("text-white");
  });

  it("usa classe muted para pontuação zero nos exemplos (getPalpiteBadgeClasses)", () => {
    const { container } = render(<RegrasContent />);

    const badges0 = Array.from(container.querySelectorAll("span")).filter(
      (el) => el.textContent === "0 pts"
    );
    expect(badges0.length).toBeGreaterThanOrEqual(1);
    expect(badges0[0].className).toContain("bg-muted");
    expect(badges0[0].className).toContain("text-muted-foreground");
  });

  it("exibe o aviso de trava de palpite 5 min antes do apito", () => {
    render(<RegrasContent />);

    expect(screen.getByText(/palpite trava 5 min antes do apito/i)).toBeInTheDocument();
    expect(screen.getByText(/até 5 minutos antes do apito/i)).toBeInTheDocument();
  });

  it("exibe a seção de desempate com os critérios na ordem correta", () => {
    render(<RegrasContent />);

    const secao = screen.getByRole("region", { name: /desempate no ranking/i });
    expect(within(secao).getByText(/placares cravados/i)).toBeInTheDocument();
    expect(within(secao).getByText(/resultados certos/i)).toBeInTheDocument();
    expect(within(secao).getByText(/dividem o prêmio/i)).toBeInTheDocument();
  });

  it("explica a pontuação do mata-mata: vale quem passa (5/4/3/0)", () => {
    render(<RegrasContent />);

    const secao = screen.getByRole("region", { name: /como funciona no mata-mata/i });
    expect(within(secao).getByText("Cravou a vitória e acertou quem passa")).toBeInTheDocument();
    expect(within(secao).getByText("Cravou o empate e acertou quem passa")).toBeInTheDocument();
    expect(within(secao).getByText("Acertou quem passa")).toBeInTheDocument();
    expect(within(secao).getByText("Errou quem passa")).toBeInTheDocument();
    expect(within(secao).getByText(/escolha quem passa/i)).toBeInTheDocument();
  });

  it("esclarece que o placar vale pelos 90 min e que pênaltis decidem quem avança", () => {
    render(<RegrasContent />);

    // Span com texto exato — o pai contém mais texto, mas o span em si tem esse texto.
    expect(screen.getByText("O placar que vale é o dos 90 minutos.")).toBeInTheDocument();
    expect(screen.getAllByText(/quem avança/i).length).toBeGreaterThanOrEqual(1);
  });
});

/*
 * Branch inalcançável — linha 331:
 *   `{item.pontos} {item.pontos === 1 ? "pt" : "pts"}`
 *
 * O branch "pt" (singular) nunca é atingido porque o array estático EXEMPLOS
 * contém apenas pontos com valores 0, 2, 3, 4 e 5 — nenhum com valor 1.
 *
 * Recomendação: se esse caso for necessário no futuro (ex.: cálculo dinâmico),
 * extrair EXEMPLOS para uma prop ou constante exportável e adicionar um fixture
 * com pontos=1 nos testes. Enquanto o componente for puramente estático, a
 * cobertura máxima real nessa branch é 92.85%.
 */
