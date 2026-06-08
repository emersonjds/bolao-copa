"use client";

import { LogIn } from "lucide-react";
import { signInWithGoogle } from "@/shared/lib/supabase";
import { DevLoginButton } from "./dev-login-button";

interface LoginCTAProps {
  /** Caminho para onde voltar após o login. */
  next?: string;
  titulo?: string;
  descricao?: string;
}

export function LoginCTA({
  next,
  titulo = "Entre para palpitar",
  descricao = "Use sua conta Google para fazer e salvar seus palpites.",
}: LoginCTAProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <LogIn className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
        <p className="max-w-xs text-xs text-muted-foreground">{descricao}</p>
      </div>
      <button
        type="button"
        onClick={() => signInWithGoogle(next)}
        className="inline-flex items-center gap-2 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-800"
      >
        Entrar com Google
      </button>
      <DevLoginButton next={next} />
    </div>
  );
}
