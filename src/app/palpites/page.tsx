"use client";

import { LoginCTA, useAuth } from "@/features/auth";
import { PalpitesContent } from "@/features/palpites/components/palpites-content";

export default function PalpitesPage() {
  const { user, loading } = useAuth();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">Meus palpites</h1>
        <p className="text-sm text-muted-foreground">Palpite trava no apito inicial da partida.</p>
      </header>

      {loading ? (
        <div
          className="h-40 animate-pulse rounded-2xl bg-muted"
          aria-busy="true"
          aria-hidden="true"
        />
      ) : !user ? (
        <LoginCTA next="/palpites" />
      ) : (
        <PalpitesContent />
      )}
    </div>
  );
}
