import { describe, expect, it } from "vitest";
import { apiUrl } from "./api-url";

describe("apiUrl", () => {
  it("mantém o path relativo quando NEXT_PUBLIC_API_URL não está definido", () => {
    expect(apiUrl("/api/partidas")).toBe("/api/partidas");
  });

  it("preserva a query string", () => {
    expect(apiUrl("/api/partidas?fase=grupos")).toBe("/api/partidas?fase=grupos");
  });
});
