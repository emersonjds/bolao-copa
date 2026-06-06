import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import type { Partida } from "@/entities/partida";
import { CardAdmin, CardAdminSkeleton } from "./card-admin";

// Estado mutável dos hooks de mutation, controlado por teste (permite simular
// isPending e onSuccess sem rede).
const hooks = vi.hoisted(() => ({
  resultado: {
    mutate: vi.fn(),
    isPending: false,
  } as { mutate: ReturnType<typeof vi.fn>; isPending: boolean },
  confronto: {
    mutate: vi.fn(),
    isPending: false,
  } as { mutate: ReturnType<typeof vi.fn>; isPending: boolean },
}));

vi.mock("../api/mutations", () => ({
  useSalvarResultado: () => hooks.resultado,
  useDefinirConfronto: () => hooks.confronto,
}));

// O diálogo (renderizado sempre, mesmo fechado) chama useSelecoes — mockamos
// para evitar rede no teste do card.
vi.mock("../api/selecoes", () => ({
  useSelecoes: () => ({
    data: [
      { id: "sel-mex", nome: "México", codigo: "MEX" },
      { id: "sel-rsa", nome: "África do Sul", codigo: "RSA" },
    ],
    isLoading: false,
  }),
}));

function makePartida(over: Partial<Partida> = {}): Partida {
  return {
    id: "p1",
    fase: "grupos",
    grupo: "A",
    dataHora: "2026-06-11T19:00:00.000Z",
    estadio: "Estádio Azteca",
    status: "agendada",
    mandante: { id: "sel-mex", nome: "México", codigo: "MEX" },
    visitante: { id: "sel-rsa", nome: "África do Sul", codigo: "RSA" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: null,
    visitanteLabel: null,
    ...over,
  };
}

beforeEach(() => {
  hooks.resultado.mutate = vi.fn();
  hooks.resultado.isPending = false;
  hooks.confronto.mutate = vi.fn();
  hooks.confronto.isPending = false;
});

describe("CardAdmin — confronto indefinido (mata-mata)", () => {
  it("mostra placeholders 'A definir' / rótulos e botão de definir confronto", () => {
    const partida = makePartida({
      fase: "oitavas",
      grupo: null,
      mandante: { id: "", nome: "1A", codigo: "1A" },
      visitante: { id: "", nome: "2B", codigo: "2B" },
      mandanteLabel: "1A",
      visitanteLabel: "2B",
    });

    renderWithProviders(<CardAdmin partida={partida} />);

    expect(screen.getByText("1A")).toBeInTheDocument();
    expect(screen.getByText("2B")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Definir confronto" })).toBeInTheDocument();
  });

  it("usa o rótulo 'A definir' quando mandanteLabel e visitanteLabel são nulos", () => {
    const partida = makePartida({
      fase: "oitavas",
      grupo: null,
      mandante: { id: "", nome: "", codigo: "" },
      visitante: { id: "", nome: "", codigo: "" },
      mandanteLabel: null,
      visitanteLabel: null,
    });

    renderWithProviders(<CardAdmin partida={partida} />);

    // Os dois placeholders caem no fallback `?? "A definir"`.
    expect(screen.getAllByText("A definir")).toHaveLength(2);
  });

  it("abre o diálogo de definição ao clicar no botão", async () => {
    const partida = makePartida({
      fase: "oitavas",
      grupo: null,
      mandante: { id: "", nome: "1A", codigo: "1A" },
      visitante: { id: "", nome: "2B", codigo: "2B" },
      mandanteLabel: "1A",
      visitanteLabel: "2B",
    });

    renderWithProviders(<CardAdmin partida={partida} />);
    await userEvent.click(screen.getByRole("button", { name: "Definir confronto" }));

    expect(screen.getByRole("heading", { name: "Definir confronto" })).toBeInTheDocument();
  });
});

describe("CardAdmin — modo edição (times definidos)", () => {
  it("salva o resultado com os gols digitados e status agendada quando não encerrada", async () => {
    const partida = makePartida();
    renderWithProviders(<CardAdmin partida={partida} />);

    await userEvent.type(screen.getByLabelText("Gols de México"), "2");
    await userEvent.type(screen.getByLabelText("Gols de África do Sul"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Salvar resultado" }));

    expect(hooks.resultado.mutate).toHaveBeenCalledTimes(1);
    expect(hooks.resultado.mutate.mock.calls[0][0]).toEqual({
      partidaId: "p1",
      golsMandante: 2,
      golsVisitante: 1,
      status: "agendada",
      vencedorPenaltis: null,
    });
  });

  it("envia status 'encerrada' quando o checkbox é marcado", async () => {
    const partida = makePartida();
    renderWithProviders(<CardAdmin partida={partida} />);

    await userEvent.type(screen.getByLabelText("Gols de México"), "3");
    await userEvent.type(screen.getByLabelText("Gols de África do Sul"), "0");
    await userEvent.click(screen.getByRole("checkbox", { name: /marcar como encerrada/i }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar resultado" }));

    expect(hooks.resultado.mutate.mock.calls[0][0]).toMatchObject({
      status: "encerrada",
      golsMandante: 3,
      golsVisitante: 0,
    });
  });

  it("mantém o botão salvar desabilitado enquanto os placares não estão preenchidos", () => {
    renderWithProviders(<CardAdmin partida={makePartida()} />);
    expect(screen.getByRole("button", { name: "Salvar resultado" })).toBeDisabled();
  });

  it("exibe o pill 'Ao vivo' (com indicador pulsante) para partida em andamento", () => {
    renderWithProviders(<CardAdmin partida={makePartida({ status: "ao-vivo" })} />);
    expect(screen.getByText("Ao vivo")).toBeInTheDocument();
  });

  it("salva partida agendada com sucesso sem fechar edição (onCancelar ausente)", async () => {
    // onSuccess dispara, mas onCancelar é undefined em partida não-encerrada.
    hooks.resultado.mutate = vi.fn((_input, opts) => opts?.onSuccess?.());
    renderWithProviders(<CardAdmin partida={makePartida()} />);

    await userEvent.type(screen.getByLabelText("Gols de México"), "2");
    await userEvent.type(screen.getByLabelText("Gols de África do Sul"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Salvar resultado" }));

    expect(hooks.resultado.mutate).toHaveBeenCalledTimes(1);
    // Continua em modo edição (não há botão Cancelar nem volta ao compacto).
    expect(screen.getByLabelText("Gols de México")).toBeInTheDocument();
  });

  it("mostra estado de salvamento e desabilita os controles quando isPending", () => {
    hooks.resultado.isPending = true;
    renderWithProviders(<CardAdmin partida={makePartida({ golsMandante: 1, golsVisitante: 1 })} />);

    const botao = screen.getByRole("button", { name: /salvando/i });
    expect(botao).toBeDisabled();
    expect(screen.getByLabelText("Gols de México")).toBeDisabled();
  });
});

describe("CardAdmin — campo de pênaltis", () => {
  it("aparece em mata-mata encerrada com empate e envia o vencedor escolhido", async () => {
    const partida = makePartida({ fase: "oitavas", grupo: null });
    renderWithProviders(<CardAdmin partida={partida} />);

    await userEvent.type(screen.getByLabelText("Gols de México"), "1");
    await userEvent.type(screen.getByLabelText("Gols de África do Sul"), "1");
    await userEvent.click(screen.getByRole("checkbox", { name: /marcar como encerrada/i }));

    // Campo de pênaltis agora visível.
    expect(screen.getByText(/vencedor nos pênaltis/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: "México" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar resultado" }));

    expect(hooks.resultado.mutate.mock.calls[0][0]).toMatchObject({
      status: "encerrada",
      vencedorPenaltis: "sel-mex",
    });
  });

  it("NÃO aparece na fase de grupos mesmo com empate encerrado", async () => {
    renderWithProviders(<CardAdmin partida={makePartida()} />);

    await userEvent.type(screen.getByLabelText("Gols de México"), "2");
    await userEvent.type(screen.getByLabelText("Gols de África do Sul"), "2");
    await userEvent.click(screen.getByRole("checkbox", { name: /marcar como encerrada/i }));

    expect(screen.queryByText(/vencedor nos pênaltis/i)).not.toBeInTheDocument();
  });

  it("NÃO aparece em mata-mata encerrado sem empate", async () => {
    const partida = makePartida({ fase: "quartas", grupo: null });
    renderWithProviders(<CardAdmin partida={partida} />);

    await userEvent.type(screen.getByLabelText("Gols de México"), "2");
    await userEvent.type(screen.getByLabelText("Gols de África do Sul"), "1");
    await userEvent.click(screen.getByRole("checkbox", { name: /marcar como encerrada/i }));

    expect(screen.queryByText(/vencedor nos pênaltis/i)).not.toBeInTheDocument();
  });
});

describe("CardAdmin — partida encerrada (compacto vs edição)", () => {
  it("inicia em modo compacto mostrando o placar e o botão de editar", () => {
    const partida = makePartida({
      status: "encerrada",
      golsMandante: 2,
      golsVisitante: 0,
    });
    renderWithProviders(<CardAdmin partida={partida} />);

    expect(screen.getByText(/México 2 × 0 África do Sul/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar resultado/i })).toBeInTheDocument();
    // Sem inputs no modo compacto.
    expect(screen.queryByLabelText("Gols de México")).not.toBeInTheDocument();
  });

  it("mostra o confronto sem números quando a encerrada não tem placar oficial", () => {
    const partida = makePartida({
      status: "encerrada",
      golsMandante: null,
      golsVisitante: null,
    });
    renderWithProviders(<CardAdmin partida={partida} />);

    // Sem placar oficial → cai no else do ternário: "Mandante × Visitante".
    expect(screen.getByText("México × África do Sul")).toBeInTheDocument();
  });

  it("entra em edição ao clicar em editar e volta ao compacto ao cancelar", async () => {
    const partida = makePartida({
      status: "encerrada",
      golsMandante: 2,
      golsVisitante: 0,
    });
    renderWithProviders(<CardAdmin partida={partida} />);

    await userEvent.click(screen.getByRole("button", { name: /editar resultado/i }));
    expect(screen.getByLabelText("Gols de México")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByLabelText("Gols de México")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar resultado/i })).toBeInTheDocument();
  });

  it("volta ao modo compacto após salvar com sucesso (onSuccess fecha a edição)", async () => {
    hooks.resultado.mutate = vi.fn((_input, opts) => opts?.onSuccess?.());
    const partida = makePartida({
      status: "encerrada",
      golsMandante: 2,
      golsVisitante: 0,
    });
    renderWithProviders(<CardAdmin partida={partida} />);

    await userEvent.click(screen.getByRole("button", { name: /editar resultado/i }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar resultado" }));

    expect(hooks.resultado.mutate).toHaveBeenCalledTimes(1);
    // Voltou para o compacto (inputs sumiram, botão editar voltou).
    expect(screen.queryByLabelText("Gols de México")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /editar resultado/i })).toBeInTheDocument();
  });
});

describe("CardAdminSkeleton", () => {
  it("renderiza um placeholder aria-hidden", () => {
    const { container } = renderWithProviders(<CardAdminSkeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
