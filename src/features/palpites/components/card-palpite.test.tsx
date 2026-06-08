import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Partida } from "@/entities/partida";
import type { Palpite } from "@/entities/palpite";
import { CardPalpite } from "./card-palpite";

// FlagIcon carrega imagens externas; substitui por <span> para isolar testes.
vi.mock("@/shared/ui/flag-icon", () => ({
  FlagIcon: ({ nome }: { nome: string }) => <span data-testid="bandeira">{nome}</span>,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Partida agendada no futuro → aberta para edição. */
const partidaAberta: Partida = {
  id: "part-1",
  fase: "grupos",
  grupo: "A",
  dataHora: "2099-06-20T19:00:00.000Z",
  janelaInicio: "2020-01-01T03:00:00Z",
  estadio: "Estadio X",
  status: "agendada",
  mandante: { id: "sel-bra", nome: "Brasil", codigo: "BRA" },
  visitante: { id: "sel-arg", nome: "Argentina", codigo: "ARG" },
  golsMandante: null,
  golsVisitante: null,
  vencedorPenaltis: null,
  mandanteLabel: null,
  visitanteLabel: null,
};

/** Partida encerrada → travada. */
const partidaTravada: Partida = {
  ...partidaAberta,
  id: "part-2",
  status: "encerrada",
  golsMandante: null,
  golsVisitante: null,
};

/** Partida agendada cuja janela de palpite ainda não abriu → futuro. */
const partidaFutura: Partida = {
  ...partidaAberta,
  id: "part-3",
  janelaInicio: "2099-06-25T03:00:00Z",
  dataHora: "2099-06-26T19:00:00.000Z",
};

/** Partida mata-mata com confronto ainda indefinido (codigo vazio). */
const partidaIndefinida: Partida = {
  ...partidaAberta,
  id: "part-ko",
  fase: "oitavas",
  grupo: null,
  mandante: { id: "", nome: "", codigo: "" },
  visitante: { id: "", nome: "", codigo: "" },
};

const palpiteSalvo: Palpite = {
  id: "palp-1",
  participanteId: "part-id-1",
  partidaId: "part-1",
  golsMandante: 2,
  golsVisitante: 0,
  pontos: null,
};

const defaultProps = {
  onChangeMandante: vi.fn(),
  onChangeVisitante: vi.fn(),
  disabled: false,
};

// ---------------------------------------------------------------------------
// Confronto indefinido
// ---------------------------------------------------------------------------

describe("CardPalpite — confronto indefinido", () => {
  it("exibe a mensagem de classificados em vez das bandeiras e inputs", () => {
    render(
      <CardPalpite
        {...defaultProps}
        partida={partidaIndefinida}
        estado="liberado"
        palpiteSalvo={undefined}
        placarLocal={undefined}
      />
    );

    expect(screen.getByText(/classificados após os jogos de grupos/i)).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Travado
// ---------------------------------------------------------------------------

describe("CardPalpite — travado", () => {
  it("exibe badge 'Travado' e inputs somente-leitura quando sem placar oficial", () => {
    render(
      <CardPalpite
        {...defaultProps}
        partida={partidaTravada}
        estado="encerrado"
        palpiteSalvo={undefined}
        placarLocal={undefined}
      />
    );

    expect(screen.getByText(/travado/i)).toBeInTheDocument();

    const inputs = screen.getAllByRole("spinbutton");
    inputs.forEach((input) => expect(input).toBeDisabled());
  });

  it("exibe o resultado oficial quando o placar da partida está disponível", () => {
    const comPlacar: Partida = {
      ...partidaTravada,
      golsMandante: 3,
      golsVisitante: 1,
    };

    render(
      <CardPalpite
        {...defaultProps}
        partida={comPlacar}
        estado="encerrado"
        palpiteSalvo={undefined}
        placarLocal={undefined}
      />
    );

    expect(screen.getByText(/resultado oficial.*3.*1/i)).toBeInTheDocument();
  });

  it("exibe a pontuação quando há resultado e palpite com pontos apurados", () => {
    const comPlacar: Partida = {
      ...partidaTravada,
      golsMandante: 2,
      golsVisitante: 0,
    };
    const comPontos: Palpite = {
      ...palpiteSalvo,
      partidaId: comPlacar.id,
      pontos: 3,
    };

    render(
      <CardPalpite
        {...defaultProps}
        partida={comPlacar}
        estado="encerrado"
        palpiteSalvo={comPontos}
        placarLocal={undefined}
      />
    );

    expect(screen.getByText(/3 pts/i)).toBeInTheDocument();
  });

  it("usa singular 'pt' quando o palpite vale exatamente 1 ponto", () => {
    const comPlacar: Partida = {
      ...partidaTravada,
      golsMandante: 1,
      golsVisitante: 0,
    };
    const comUmPonto: Palpite = {
      ...palpiteSalvo,
      partidaId: comPlacar.id,
      pontos: 1,
    };

    render(
      <CardPalpite
        {...defaultProps}
        partida={comPlacar}
        estado="encerrado"
        palpiteSalvo={comUmPonto}
        placarLocal={undefined}
      />
    );

    expect(screen.getByText(/1 pt\b/)).toBeInTheDocument();
  });

  it("não exibe pontuação quando palpite.pontos é null", () => {
    const comPlacar: Partida = {
      ...partidaTravada,
      golsMandante: 1,
      golsVisitante: 1,
    };
    const semPontos: Palpite = {
      ...palpiteSalvo,
      partidaId: comPlacar.id,
      pontos: null,
    };

    render(
      <CardPalpite
        {...defaultProps}
        partida={comPlacar}
        estado="encerrado"
        palpiteSalvo={semPontos}
        placarLocal={undefined}
      />
    );

    expect(screen.queryByText(/pts|pt\b/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Aberto
// ---------------------------------------------------------------------------

describe("CardPalpite — aberto", () => {
  it("renderiza inputs editáveis vazios quando não há palpite salvo nem local", () => {
    render(
      <CardPalpite
        {...defaultProps}
        partida={partidaAberta}
        estado="liberado"
        palpiteSalvo={undefined}
        placarLocal={undefined}
      />
    );

    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(2);
    inputs.forEach((input) => {
      expect(input).not.toBeDisabled();
      expect(input).toHaveValue(null); // input vazio retorna null em number
    });
  });

  it("exibe badge 'Salvo' quando há palpite no servidor e nenhuma alteração local", () => {
    render(
      <CardPalpite
        {...defaultProps}
        partida={partidaAberta}
        estado="liberado"
        palpiteSalvo={palpiteSalvo}
        placarLocal={undefined}
      />
    );

    expect(screen.getByText(/salvo/i)).toBeInTheDocument();
  });

  it("não exibe badge 'Salvo' quando o placarLocal difere do palpite salvo (pendente)", () => {
    render(
      <CardPalpite
        {...defaultProps}
        partida={partidaAberta}
        estado="liberado"
        palpiteSalvo={palpiteSalvo}
        // Valor local diferente do salvo → hasPendente = true, hasSalvo = false
        placarLocal={{ mandante: "1", visitante: "1" }}
      />
    );

    expect(screen.queryByText(/salvo/i)).not.toBeInTheDocument();

    // Os inputs exibem os valores locais
    const inputMandante = screen.getByRole("spinbutton", { name: /gols do brasil/i });
    const inputVisitante = screen.getByRole("spinbutton", { name: /gols do argentina/i });
    expect(inputMandante).toHaveValue(1);
    expect(inputVisitante).toHaveValue(1);
  });

  it("fica pendente quando só o gol do visitante difere do salvo (ramo direito do ||)", () => {
    render(
      <CardPalpite
        {...defaultProps}
        partida={partidaAberta}
        estado="liberado"
        palpiteSalvo={palpiteSalvo} // 2 × 0
        // mandante igual ao salvo, visitante diferente → ramo esquerdo falso,
        // ramo direito do || avaliado → hasPendente = true, sem badge "Salvo".
        placarLocal={{ mandante: "2", visitante: "1" }}
      />
    );

    expect(screen.queryByText(/salvo/i)).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: /gols do argentina/i })).toHaveValue(1);
  });

  it("chama onChangeMandante ao alterar o input do mandante", async () => {
    const onChangeMandante = vi.fn();
    render(
      <CardPalpite
        {...defaultProps}
        onChangeMandante={onChangeMandante}
        partida={partidaAberta}
        estado="liberado"
        palpiteSalvo={undefined}
        placarLocal={undefined}
      />
    );

    const inputMandante = screen.getByRole("spinbutton", { name: /gols do brasil/i });
    await userEvent.type(inputMandante, "2");

    expect(onChangeMandante).toHaveBeenCalled();
  });

  it("chama onChangeVisitante ao alterar o input do visitante", async () => {
    const onChangeVisitante = vi.fn();
    render(
      <CardPalpite
        {...defaultProps}
        onChangeVisitante={onChangeVisitante}
        partida={partidaAberta}
        estado="liberado"
        palpiteSalvo={undefined}
        placarLocal={undefined}
      />
    );

    const inputVisitante = screen.getByRole("spinbutton", { name: /gols do argentina/i });
    await userEvent.type(inputVisitante, "1");

    expect(onChangeVisitante).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Futuro (palpite dia a dia)
// ---------------------------------------------------------------------------

describe("CardPalpite — futuro", () => {
  it("estado futuro: mostra 'Libera amanhã' e mantém inputs habilitados", () => {
    render(
      <CardPalpite
        partida={partidaFutura}
        estado="futuro"
        palpiteSalvo={undefined}
        placarLocal={undefined}
        onChangeMandante={() => {}}
        onChangeVisitante={() => {}}
        disabled={false}
      />
    );
    expect(screen.getByText(/libera amanhã/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Gols do/i)[0]).not.toBeDisabled();
  });

  it("estado futuro com rascunho: mostra microcopy de rascunho", () => {
    render(
      <CardPalpite
        partida={partidaFutura}
        estado="futuro"
        palpiteSalvo={undefined}
        placarLocal={{ mandante: "2", visitante: "1" }}
        onChangeMandante={() => {}}
        onChangeVisitante={() => {}}
        disabled={false}
      />
    );
    expect(screen.getByText(/rascunho guardado/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Fallback de fase desconhecida no badgeGrupo
// ---------------------------------------------------------------------------

describe("CardPalpite — fase não mapeada no FASE_LABEL (linha 97 fallback ??)", () => {
  it("usa a própria string da fase como badge quando grupo é null e fase não está no mapeamento", () => {
    // Cobre o branch `FASE_LABEL[partida.fase] ?? partida.fase` quando a fase
    // não existe no mapa (nenhuma das chaves conhecidas) e grupo é null.
    const comFaseDesconhecida: Partida = {
      ...partidaTravada,
      fase: "preliminar" as unknown as Partida["fase"],
      grupo: null,
    };

    render(
      <CardPalpite
        {...defaultProps}
        partida={comFaseDesconhecida}
        estado="encerrado"
        palpiteSalvo={undefined}
        placarLocal={undefined}
      />
    );

    expect(screen.getByText("preliminar")).toBeInTheDocument();
  });
});
