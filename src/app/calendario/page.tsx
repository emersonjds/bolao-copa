import type { Metadata } from "next";
import { CalendarioContent } from "@/features/calendario";

export const metadata: Metadata = {
  title: "Agenda da Copa — Bolão da Copa 2026",
  description: "Calendário completo de jogos da Copa do Mundo 2026.",
};

export default function CalendarioPage() {
  return (
    <div>
      <header className="mb-4 space-y-1">
        <h1 className="font-display text-2xl font-bold text-foreground">Agenda da Copa</h1>
        <p className="text-sm text-muted-foreground">Copa do Mundo · Jun–Jul 2026</p>
      </header>

      <CalendarioContent />
    </div>
  );
}
