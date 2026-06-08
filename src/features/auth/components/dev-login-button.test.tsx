import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";

const { signInDev } = vi.hoisted(() => ({ signInDev: vi.fn() }));
vi.mock("@/shared/lib/supabase", () => ({ signInDev }));

import { DevLoginButton } from "./dev-login-button";

// Mock de window.location para evitar navegação real no jsdom.
const assignMock = vi.fn();

describe("DevLoginButton", () => {
  beforeEach(() => {
    signInDev.mockReset();
    assignMock.mockReset();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubGlobal("location", { assign: assignMock, origin: "http://localhost" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("retorna null quando NODE_ENV não é 'development'", () => {
    // Restaura antes de renderizar para que NODE_ENV seja 'test'.
    vi.unstubAllEnvs();
    const { container } = render(<DevLoginButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza o painel de atalho quando NODE_ENV é 'development'", () => {
    render(<DevLoginButton />);
    expect(screen.getByText(/atalho de desenvolvimento/i)).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /conta de teste/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /logar em dev/i })).toBeInTheDocument();
  });

  it("lista todas as contas de desenvolvimento no select", () => {
    render(<DevLoginButton />);
    const select = screen.getByRole("combobox", { name: /conta de teste/i });
    // 5 opções conforme CONTAS_DEV.
    expect(select.querySelectorAll("option")).toHaveLength(5);
  });

  it("chama signInDev com a conta padrão (demo@bolao.test) ao logar", async () => {
    signInDev.mockResolvedValue(undefined);
    render(<DevLoginButton />);

    await userEvent.click(screen.getByRole("button", { name: /logar em dev/i }));

    await waitFor(() =>
      expect(signInDev).toHaveBeenCalledWith("demo@bolao.test", "Senha-Demo-2026!")
    );
  });

  it("muda de conta ao alterar o select e usa o novo email no login", async () => {
    signInDev.mockResolvedValue(undefined);
    render(<DevLoginButton />);

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /conta de teste/i }),
      "ana@bolao.test"
    );

    await userEvent.click(screen.getByRole("button", { name: /logar em dev/i }));

    await waitFor(() =>
      expect(signInDev).toHaveBeenCalledWith("ana@bolao.test", "Senha-Demo-2026!")
    );
  });

  it("redireciona para '/' após login bem-sucedido sem 'next' especificado", async () => {
    signInDev.mockResolvedValue(undefined);
    render(<DevLoginButton />);

    await userEvent.click(screen.getByRole("button", { name: /logar em dev/i }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/"));
  });

  it("redireciona para o caminho 'next' após login bem-sucedido", async () => {
    signInDev.mockResolvedValue(undefined);
    render(<DevLoginButton next="/palpites" />);

    await userEvent.click(screen.getByRole("button", { name: /logar em dev/i }));

    await waitFor(() => expect(assignMock).toHaveBeenCalledWith("/palpites"));
  });

  it("exibe mensagem de erro quando signInDev rejeita com Error", async () => {
    signInDev.mockRejectedValue(new Error("Credenciais inválidas"));
    render(<DevLoginButton />);

    await userEvent.click(screen.getByRole("button", { name: /logar em dev/i }));

    await waitFor(() =>
      expect(screen.getByText("Credenciais inválidas")).toBeInTheDocument()
    );
    // O botão deve voltar a estar disponível após o erro.
    expect(screen.getByRole("button", { name: /logar em dev/i })).not.toBeDisabled();
  });

  it("exibe 'Falha no login dev' quando o erro não é instância de Error", async () => {
    signInDev.mockRejectedValue("falha genérica como string");
    render(<DevLoginButton />);

    await userEvent.click(screen.getByRole("button", { name: /logar em dev/i }));

    await waitFor(() =>
      expect(screen.getByText("Falha no login dev")).toBeInTheDocument()
    );
  });
});
