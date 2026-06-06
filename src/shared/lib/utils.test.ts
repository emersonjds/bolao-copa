import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("junta classes simples separadas por espaço", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("ignora valores falsy (false/null/undefined/'')", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  it("resolve conflitos do Tailwind mantendo a última classe (twMerge)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("aceita sintaxe condicional de objeto (clsx)", () => {
    expect(cn({ ativo: true, inativo: false })).toBe("ativo");
  });

  it("aceita arrays aninhados", () => {
    expect(cn(["a", ["b", false], "c"])).toBe("a b c");
  });

  it("retorna string vazia sem argumentos", () => {
    expect(cn()).toBe("");
  });
});
