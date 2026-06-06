import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: () => <div data-testid="devtools" />,
}));

import { QueryProvider } from "./query-provider";

describe("QueryProvider", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renderiza os filhos", () => {
    render(
      <QueryProvider>
        <span>conteúdo</span>
      </QueryProvider>
    );
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });

  it("não renderiza o devtools fora de desenvolvimento", () => {
    render(
      <QueryProvider>
        <span>oi</span>
      </QueryProvider>
    );
    expect(screen.queryByTestId("devtools")).toBeNull();
  });

  it("renderiza o devtools em desenvolvimento", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(
      <QueryProvider>
        <span>oi</span>
      </QueryProvider>
    );
    expect(screen.getByTestId("devtools")).toBeInTheDocument();
  });
});
