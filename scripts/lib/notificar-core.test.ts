// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  jogosDeHoje,
  prazoDoDia,
  pendencias,
  enviarPendencias,
  type Partida,
  type Pendencia,
} from "./notificar-core";

const SELECOES = [
  { id: "s-bra", nome: "Brasil", codigo: "BRA" },
  { id: "s-srb", nome: "Sérvia", codigo: "SRB" },
];

function partida(over: Partial<Partida>): Partida {
  return {
    id: "p1",
    data_hora: "2026-06-25T20:00:00Z",
    status: "agendada",
    mandante_id: "s-bra",
    visitante_id: "s-srb",
    mandante_label: null,
    visitante_label: null,
    ...over,
  };
}

const AGORA = new Date("2026-06-25T12:00:00Z"); // 09:00 BRT de 25/06

describe("jogosDeHoje", () => {
  it("pega só jogos agendados de hoje (BRT), resolve nomes e ordena", () => {
    const jogos = jogosDeHoje(
      [
        partida({ id: "hoje-tarde", data_hora: "2026-06-25T20:00:00Z" }), // 17:00 BRT 25/06
        partida({ id: "hoje-noite", data_hora: "2026-06-26T02:00:00Z" }), // 23:00 BRT 25/06 (borda)
        partida({ id: "ja-foi", status: "encerrada" }),
        partida({ id: "amanha", data_hora: "2026-06-26T20:00:00Z" }), // 17:00 BRT 26/06
      ],
      SELECOES,
      AGORA
    );
    expect(jogos.map((j) => j.id)).toEqual(["hoje-tarde", "hoje-noite"]);
    expect(jogos[0]).toMatchObject({ mandante: "Brasil", visitante: "Sérvia", horaBrt: "17:00" });
  });

  it("usa label quando não há seleção (mata-mata)", () => {
    const jogos = jogosDeHoje(
      [
        partida({
          mandante_id: null,
          visitante_id: null,
          mandante_label: "1A",
          visitante_label: "2B",
        }),
      ],
      SELECOES,
      AGORA
    );
    expect(jogos[0]).toMatchObject({ mandante: "1A", visitante: "2B" });
  });

  it("dia sem jogo retorna vazio", () => {
    expect(jogosDeHoje([partida({ data_hora: "2026-07-01T20:00:00Z" })], SELECOES, AGORA)).toEqual(
      []
    );
  });
});

describe("prazoDoDia", () => {
  it("retorna o apito mais cedo", () => {
    const jogos = jogosDeHoje(
      [
        partida({ id: "noite", data_hora: "2026-06-26T02:00:00Z" }),
        partida({ id: "tarde", data_hora: "2026-06-25T20:00:00Z" }),
      ],
      SELECOES,
      AGORA
    );
    expect(prazoDoDia(jogos)).toBe("17:00");
  });
});

describe("pendencias", () => {
  it("inclui quem falta ≥1 palpite e ignora quem completou ou não tem e-mail", () => {
    const jogos = jogosDeHoje(
      [
        partida({ id: "j1", data_hora: "2026-06-25T20:00:00Z" }),
        partida({ id: "j2", data_hora: "2026-06-26T02:00:00Z" }),
      ],
      SELECOES,
      AGORA
    );
    const lista = pendencias(
      [
        { id: "part-falta", user_id: "u1" }, // só palpitou j1 → falta j2
        { id: "part-completo", user_id: "u2" }, // palpitou j1 e j2
        { id: "part-sem-email", user_id: "u3" }, // falta tudo, mas sem e-mail
      ],
      jogos,
      [
        { participante_id: "part-falta", partida_id: "j1" },
        { participante_id: "part-completo", partida_id: "j1" },
        { participante_id: "part-completo", partida_id: "j2" },
      ],
      [
        { user_id: "u1", nome: "Ana", email: "ana@x.com" },
        { user_id: "u2", nome: "Bia", email: "bia@x.com" },
        { user_id: "u3", nome: "Cau", email: "" },
      ]
    );
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({
      participanteId: "part-falta",
      email: "ana@x.com",
      nome: "Ana",
    });
    expect(lista[0].jogos.map((j) => j.id)).toEqual(["j2"]);
  });
});

describe("enviarPendencias", () => {
  function pendencia(id: string): Pendencia {
    return {
      participanteId: id,
      email: `${id}@x.com`,
      nome: id,
      jogos: [
        {
          id: "j1",
          dataHora: "2026-06-25T20:00:00Z",
          mandante: "Brasil",
          visitante: "Sérvia",
          horaBrt: "17:00",
        },
      ],
    };
  }

  it("pula já-enviados, envia o resto, registra só os enviados e segue após falha", async () => {
    const enviados: string[] = [];
    const registrados: string[] = [];
    const resumo = await enviarPendencias([pendencia("a"), pendencia("b"), pendencia("c")], {
      appUrl: "https://app/palpites",
      jaEnviado: (id) => id === "a", // 'a' já recebeu hoje
      enviar: async (para) => {
        if (para === "c@x.com") throw new Error("smtp caiu");
        enviados.push(para);
      },
      registrar: async (id) => {
        registrados.push(id);
      },
    });
    expect(enviados).toEqual(["b@x.com"]);
    expect(registrados).toEqual(["b"]); // 'a' pulado, 'c' falhou → não registra
    expect(resumo).toEqual({ enviados: 1, pulados: 1, falhas: 1 });
  });
});
