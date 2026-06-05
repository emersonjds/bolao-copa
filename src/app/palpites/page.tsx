"use client";

import { Target } from "lucide-react";
import { LoginCTA, useAuth } from "@/features/auth";

export default function PalpitesPage() {
  const { user, loading } = useAuth();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">Meus palpites</h1>
        <p className="text-sm text-muted-foreground">
          Garanta seus pontos prevendo os resultados da Copa.
        </p>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
          Carregando...
        </div>
      ) : !user ? (
        <LoginCTA next="/palpites" />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Target className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="text-sm font-medium text-foreground">Tela de palpites em construção</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Aqui você vai colocar o placar de cada jogo. O palpite trava no apito inicial.
          </p>
        </div>
      )}
    </div>
  );
}
