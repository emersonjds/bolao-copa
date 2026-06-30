// @vitest-environment node
import { describe, it, expect } from "vitest";
import { renderLembrete } from "./email-template";

const DADOS = {
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

  it("inclui saudação genérica, jogos, prazo, link e opt-out no texto", () => {
    const { texto } = renderLembrete(DADOS);
    expect(texto).toContain("craque"); // saudação genérica, sem nome
    expect(texto).toContain("Brasil");
    expect(texto).toContain("Sérvia");
    expect(texto).toContain("1A");
    expect(texto).toContain("16:00");
    expect(texto).toContain("https://resenha-bolao-da-copa.netlify.app/palpites");
    expect(texto.toLowerCase()).toContain("responde");
  });
});
