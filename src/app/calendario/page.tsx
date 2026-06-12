import type { Metadata } from "next";
import { CalendarioAbas } from "@/widgets/calendario-abas";

export const metadata: Metadata = {
  title: "Copa 2026 — Bolão da Copa 2026",
  description: "Agenda de jogos e classificação dos grupos da Copa do Mundo 2026.",
};

export default function CalendarioPage() {
  return (
    <div>
      <header className="mb-4 space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground">Copa 2026</h1>
        <p className="text-sm text-muted-foreground">Agenda e grupos · Jun–Jul 2026</p>
      </header>

      <CalendarioAbas />
    </div>
  );
}
