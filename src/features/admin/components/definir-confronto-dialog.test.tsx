import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { toast } from "sonner";
import { renderWithProviders } from "@/test/render";
import { server } from "@/test/msw/server";
import { restList, restWrite, restError } from "@/test/msw/handlers";
import { selecaoMexicoDb, selecaoAfricaDb } from "@/test/fixtures";
import type { FaseCopa, Partida } from "@/entities/partida";
import { DefinirConfrontoDialog } from "./definir-confronto-dialog";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makePartidaIndefinida(): Partida {
  return {
    id: "part-ko",
    fase: "oitavas",
    grupo: null,
    dataHora: "2026-07-04T19:00:00.000Z",
    janelaInicio: "2026-07-04T03:00:00Z",
    estadio: "MetLife",
    status: "agendada",
    mandante: { id: "", nome: "1A", codigo: "1A" },
    visitante: { id: "", nome: "2B", codigo: "2B" },
    golsMandante: null,
    golsVisitante: null,
    vencedorPenaltis: null,
    mandanteLabel: "1A",
    visitanteLabel: "2B",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DefinirConfrontoDialog", () => {
  it("não renderiza o conteúdo quando fechado", () => {
    server.use(restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]));
    renderWithProviders(
      <DefinirConfrontoDialog
        partida={makePartidaIndefinida()}
        open={false}
        onOpenChange={() => {}}
      />
    );

    expect(screen.queryByRole("heading", { name: "Definir confronto" })).not.toBeInTheDocument();
  });

  it("exibe título, descrição da fase e carrega as seleções nos selects", async () => {
    server.use(restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]));
    renderWithProviders(
      <DefinirConfrontoDialog partida={makePartidaIndefinida()} open onOpenChange={() => {}} />
    );

    expect(screen.getByRole("heading", { name: "Definir confronto" })).toBeInTheDocument();
    expect(screen.getByText(/Oitavas de Final/)).toBeInTheDocument();

    // Selects começam desabilitados enquanto as seleções carregam.
    const mandante = screen.getByLabelText("Mandante (casa)");
    expect(mandante).toBeDisabled();

    await waitFor(() => expect(mandante).not.toBeDisabled());
    expect(within(mandante).getByRole("option", { name: "Mexico (MEX)" })).toBeInTheDocument();
  });

  it("mantém o botão confirmar desabilitado até ter mandante e visitante distintos", async () => {
    server.use(restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]));
    renderWithProviders(
      <DefinirConfrontoDialog partida={makePartidaIndefinida()} open onOpenChange={() => {}} />
    );

    const confirmar = screen.getByRole("button", { name: "Confirmar confronto" });
    expect(confirmar).toBeDisabled();

    const mandante = screen.getByLabelText("Mandante (casa)");
    await waitFor(() => expect(mandante).not.toBeDisabled());

    await userEvent.selectOptions(mandante, "sel-mex");
    // Só com o mandante ainda fica desabilitado.
    expect(confirmar).toBeDisabled();
  });

  it("define o confronto, fecha o diálogo e exibe toast de sucesso", async () => {
    server.use(
      restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]),
      restWrite("partidas", { method: "patch", status: 204 })
    );
    const onOpenChange = vi.fn();
    renderWithProviders(
      <DefinirConfrontoDialog partida={makePartidaIndefinida()} open onOpenChange={onOpenChange} />
    );

    const mandante = screen.getByLabelText("Mandante (casa)");
    await waitFor(() => expect(mandante).not.toBeDisabled());

    await userEvent.selectOptions(mandante, "sel-mex");
    await userEvent.selectOptions(screen.getByLabelText("Visitante (fora)"), "sel-rsa");

    const confirmar = screen.getByRole("button", { name: "Confirmar confronto" });
    expect(confirmar).toBeEnabled();
    await userEvent.click(confirmar);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Confronto definido com sucesso.")
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("mostra o estado 'Confirmando...' enquanto a mutação está em andamento", async () => {
    server.use(
      restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]),
      // PATCH lento: mantém a mutação em isPending para exibir o spinner.
      http.patch("*/rest/v1/partidas", async () => {
        await delay(50);
        return new HttpResponse(null, { status: 204 });
      })
    );
    renderWithProviders(
      <DefinirConfrontoDialog partida={makePartidaIndefinida()} open onOpenChange={() => {}} />
    );

    const mandante = screen.getByLabelText("Mandante (casa)");
    await waitFor(() => expect(mandante).not.toBeDisabled());

    await userEvent.selectOptions(mandante, "sel-mex");
    await userEvent.selectOptions(screen.getByLabelText("Visitante (fora)"), "sel-rsa");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar confronto" }));

    // Durante o PATCH lento, o botão mostra o spinner "Confirmando...".
    expect(await screen.findByText("Confirmando...")).toBeInTheDocument();

    // Conclui para não deixar promessas pendentes.
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Confronto definido com sucesso.")
    );
  });

  it("usa a fase como label de fallback quando não consta no dicionário interno", async () => {
    // Cobre a branch `?? partida.fase` da linha 42 — uma fase fora do dicionário
    // FASE_LABEL faz o operador ?? retornar o valor bruto de partida.fase.
    server.use(restList("selecoes", []));
    const faseDesconhecida = "fase-extra" as unknown as FaseCopa;
    renderWithProviders(
      <DefinirConfrontoDialog
        partida={{ ...makePartidaIndefinida(), fase: faseDesconhecida }}
        open
        onOpenChange={() => {}}
      />
    );
    // A descrição do dialog exibe o valor bruto da fase como fallback.
    expect(screen.getByText(/fase-extra/)).toBeInTheDocument();
  });

  it("handleConfirmar retorna cedo (guardas de validação) quando IDs não estão selecionados", async () => {
    // Cobre os branches de retorno antecipado das linhas 46-47 de handleConfirmar.
    // A button está disabled pelo React, mas fireEvent dispara o evento DOM diretamente.
    server.use(restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]));
    renderWithProviders(
      <DefinirConfrontoDialog partida={makePartidaIndefinida()} open onOpenChange={() => {}} />
    );

    const confirmar = screen.getByRole("button", { name: "Confirmar confronto" });
    // Estado inicial: mandanteId = "" e visitanteId = "" → cobre linha 46 (return).
    fireEvent.click(confirmar);
    // Nenhuma requisição deve ter sido disparada.
    expect(toast.success).not.toHaveBeenCalled();

    // Seleciona mandante; visitante ainda vazio → linha 46 ainda cobre.
    const mandante = screen.getByLabelText("Mandante (casa)");
    await waitFor(() => expect(mandante).not.toBeDisabled());
    await userEvent.selectOptions(mandante, "sel-mex");
    fireEvent.click(confirmar);
    expect(toast.success).not.toHaveBeenCalled();

    // Força visitante igual ao mandante via fireEvent.change (bypassa opção disabled).
    // Cobre linha 47: mandanteId === visitanteId → return.
    fireEvent.change(screen.getByLabelText("Visitante (fora)"), {
      target: { value: "sel-mex" },
    });
    fireEvent.click(confirmar);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("exibe toast de erro e mantém o diálogo aberto quando o PATCH falha", async () => {
    server.use(
      restList("selecoes", [selecaoMexicoDb, selecaoAfricaDb]),
      restError("partidas", {
        method: "patch",
        status: 403,
        message: "sem permissão",
      })
    );
    const onOpenChange = vi.fn();
    renderWithProviders(
      <DefinirConfrontoDialog partida={makePartidaIndefinida()} open onOpenChange={onOpenChange} />
    );

    const mandante = screen.getByLabelText("Mandante (casa)");
    await waitFor(() => expect(mandante).not.toBeDisabled());

    await userEvent.selectOptions(mandante, "sel-mex");
    await userEvent.selectOptions(screen.getByLabelText("Visitante (fora)"), "sel-rsa");
    await userEvent.click(screen.getByRole("button", { name: "Confirmar confronto" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao definir confronto: sem permissão")
    );
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
