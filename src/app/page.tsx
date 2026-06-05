import { Trophy } from "lucide-react";
import { ProximosJogos } from "@/features/partidas";

export default function HomePage() {
  return (
    <main id="main-content" className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg">
          <Trophy className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Bolão da Copa 2026</h1>
        <p className="max-w-md text-muted-foreground">
          Dê seus palpites nos jogos da Copa do Mundo e dispute o ranking com a galera.
        </p>
        <span className="rounded-full bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-600">
          Esqueleto inicial — em construção
        </span>
      </header>

      <section className="mt-12" aria-labelledby="proximos-jogos-titulo">
        <h2 id="proximos-jogos-titulo" className="mb-4 text-lg font-semibold text-foreground">
          Próximos jogos
        </h2>
        <ProximosJogos />
      </section>
    </main>
  );
}
