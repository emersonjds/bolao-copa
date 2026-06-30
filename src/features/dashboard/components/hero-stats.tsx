"use client";

import { useAuth, useUser } from "@/features/auth";
import { useRanking } from "@/features/ranking";
import { useMeuParticipanteId, signInWithGoogle } from "@/shared/lib/supabase";

function primeirNome(nomeCompleto: string | undefined | null): string {
  if (!nomeCompleto) return "Campeão";
  return nomeCompleto.trim().split(/\s+/)[0];
}

function Skeleton() {
  return (
    <div className="h-40 animate-pulse rounded-2xl bg-muted" aria-busy="true" aria-hidden="true" />
  );
}

function SemSessao() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-5 py-8 text-center shadow-sm">
      <div className="space-y-1">
        <p className="font-display text-base font-bold text-foreground">
          Faça login para ver sua posição
        </p>
        <p className="text-xs text-muted-foreground">Acompanhe seu ranking e palpites do bolão.</p>
      </div>
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="min-h-11 w-full max-w-xs rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-900"
      >
        Entrar com Google
      </button>
    </section>
  );
}

export function HeroStats() {
  const { loading: authLoading } = useAuth();
  const user = useUser();
  const meuId = useMeuParticipanteId();
  const { data: ranking, isLoading: rankingLoading, isError, refetch } = useRanking();

  if (authLoading || (user && rankingLoading)) {
    return <Skeleton />;
  }

  if (!user) {
    return <SemSessao />;
  }

  if (isError) {
    return (
      <section className="rounded-2xl bg-brand-800 p-5 text-white shadow-sm">
        <p className="text-sm text-white/70">
          Não foi possível carregar os dados. Tente novamente.
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 min-h-11 rounded-xl border border-white/30 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          Tentar novamente
        </button>
      </section>
    );
  }

  const nome = primeirNome(user.user_metadata?.full_name ?? user.user_metadata?.name);

  const meuItem = meuId && ranking ? ranking.find((r) => r.participanteId === meuId) : null;
  const posicao =
    meuId && ranking ? ranking.findIndex((r) => r.participanteId === meuId) + 1 : null;
  const totalParticipantes = ranking?.length ?? 0;

  return (
    <section
      aria-label="Sua posição no bolão"
      className="rounded-2xl bg-brand-800 p-5 text-white shadow-sm"
    >
      <p className="text-sm text-white/70">Olá, {nome}</p>
      <h1 className="mt-0.5 font-display text-xl font-bold text-white">Sua posição no bolão</h1>

      {meuItem && posicao ? (
        <>
          <div className="mt-3 flex items-end gap-2">
            <span className="font-mono text-5xl leading-none font-bold text-gold-400">
              {posicao}º
            </span>
            <span className="pb-1 text-sm text-white/70">
              de {totalParticipantes} participantes
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <dt className="text-[11px] tracking-wide text-white/60 uppercase">Pontos totais</dt>
              <dd className="mt-0.5 font-mono text-xl font-bold text-white">
                {meuItem.pontosTotais}
              </dd>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2.5">
              <dt className="text-[11px] tracking-wide text-white/60 uppercase">Jogos pontuados</dt>
              <dd className="mt-0.5 font-mono text-xl font-bold text-white">
                {meuItem.jogosPontuados}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/60">Ainda sem palpites pontuados.</p>
      )}
    </section>
  );
}
