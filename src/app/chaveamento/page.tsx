import type { Metadata } from "next";
import { ChaveamentoContent } from "@/features/chaveamento";

export const metadata: Metadata = {
  title: "Chaveamento — Bolão da Copa 2026",
  description: "Veja o chaveamento completo do mata-mata da Copa do Mundo 2026.",
};

export default function ChaveamentoPage() {
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">Chaveamento</h1>
        <p className="text-sm text-muted-foreground">Mata-mata da Copa 2026</p>
      </header>

      <ChaveamentoContent />
    </div>
  );
}
