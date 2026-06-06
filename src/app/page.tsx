import Link from "next/link";
import { HeroStats, ProximoJogoDestaque } from "@/features/dashboard";
import { ProximosJogos } from "@/features/partidas";
import { DestaqueRodadaCard } from "@/features/ranking";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Posição do usuário no bolão */}
      <HeroStats />

      {/* Próximo jogo (somente quando agendado nas próximas 24h) */}
      <ProximoJogoDestaque />

      {/* Lista de próximos jogos */}
      <section aria-labelledby="proximos-jogos-titulo">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="proximos-jogos-titulo" className="font-display text-lg font-bold text-foreground">
            Próximos jogos
          </h2>

          {/* Link "Ver agenda completa" — visível em sm+ */}
          <Link
            href="/calendario"
            className="hidden text-sm font-medium text-brand-600 underline-offset-2 hover:text-brand-800 hover:underline sm:block"
          >
            Ver agenda completa
          </Link>
        </div>

        <ProximosJogos />

        {/* Botão outline abaixo da lista — área de toque maior em mobile */}
        <Link
          href="/calendario"
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl border border-brand-200 text-sm font-medium text-brand-700 transition-colors hover:bg-brand-50 sm:hidden"
        >
          Ver agenda completa da Copa
        </Link>
      </section>

      {/* Destaque da rodada — auto-suficiente, retorna null sem dados */}
      <DestaqueRodadaCard />
    </div>
  );
}
