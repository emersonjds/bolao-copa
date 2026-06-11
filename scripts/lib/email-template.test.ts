// @vitest-environment node
import { describe, it, expect } from "vitest";
import { renderLembrete } from "./email-template";

const DADOS = {
  nome: "Ana",
  jogos: [
    { mandante: "Brasil", visitante: "Sérvia", horaBrt: "16:00" },
    { mandante: "1A", visitante: "2B", horaBrt: "20:00" },
  ],
  prazo: "16:00",
  appUrl: "https://resenha-bolao-da-copa.netlify.app/palpites",
};

describe("renderLembrete", () => {
  it("monta assunto com a contagem de jogos", () => {
    expect(renderLembrete(DADOS).assunto).toContain("2");
  });

  it("inclui nome, jogos, prazo, botão e opt-out no HTML", () => {
    const { html } = renderLembrete(DADOS);
    expect(html).toContain("Ana");
    expect(html).toContain("Brasil");
    expect(html).toContain("Sérvia");
    expect(html).toContain("1A");
    expect(html).toContain("16:00");
    expect(html).toContain("https://resenha-bolao-da-copa.netlify.app/palpites");
    expect(html.toLowerCase()).toContain("responde");
  });

  it("gera versão texto puro com os jogos", () => {
    const { texto } = renderLembrete(DADOS);
    expect(texto).toContain("Brasil");
    expect(texto).toContain("Sérvia");
    expect(texto).toContain("/palpites");
  });
});
