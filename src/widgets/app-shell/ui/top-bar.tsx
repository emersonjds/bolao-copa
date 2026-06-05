"use client";

import { Bell, LogOut, Trophy } from "lucide-react";
import { useAuth } from "@/features/auth";
import { signOutUser } from "@/shared/lib/supabase";

/** Barra superior fixa: marca do bolão + sino + sair (quando logado). */
export function TopBar() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            Bolão da Copa
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Notificações"
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
          </button>
          {user && (
            <button
              type="button"
              aria-label="Sair"
              onClick={() => signOutUser()}
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
