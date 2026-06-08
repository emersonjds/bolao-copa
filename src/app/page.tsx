import Link from "next/link";
import { HeroStats, ProximoJogoDestaque } from "@/features/dashboard";
import { ProximosJogos } from "@/features/partidas";
import { DestaqueRodadaCard } from "@/features/ranking";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <HeroStats />

      <ProximoJogoDestaque />

      <section aria-labelledby="proximos-jogos-titulo">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="proximos-jogos-titulo" className="font-display text-lg font-bold text-foreground">
            Próximos jogos
          </h2>

          <Link
            href="/calendario"
            className="shrink-0 text-sm font-medium whitespace-nowrap text-brand-600 underline-offset-2 hover:text-brand-800 hover:underline"
          >
            Ver agenda completa
          </Link>
        </div>

        <ProximosJogos />
      </section>

      <DestaqueRodadaCard />
    </div>
  );
}
