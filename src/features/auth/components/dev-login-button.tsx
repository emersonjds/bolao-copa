"use client";

import { useState } from "react";
import { signInDev } from "@/shared/lib/supabase";

/**
 * Atalho de DESENVOLVIMENTO: entra direto numa conta do cenário de teste
 * (Supabase local + `pnpm scenario:seed`), sem Google OAuth. Renderiza apenas
 * quando `NODE_ENV === "development"`, então nunca aparece no build de produção.
 */

interface ContaDev {
  email: string;
  rotulo: string;
}

const CONTAS_DEV: ContaDev[] = [
  { email: "demo@bolao.test", rotulo: "Você (Demo) — meio do ranking" },
  { email: "ana@bolao.test", rotulo: "Ana Atacante — líder (crava muito)" },
  { email: "bruno@bolao.test", rotulo: "Bruno Zagueiro — vice" },
  { email: "carla@bolao.test", rotulo: "Carla Meio — parte de baixo" },
  { email: "diego@bolao.test", rotulo: "Diego Lanterna — lanterna" },
];

// Senha do cenário local (não-secreta; documentada em .env.test.example).
const SENHA_DEV = "Senha-Demo-2026!";

interface DevLoginButtonProps {
  /** Caminho para onde ir após logar. */
  next?: string;
}

export function DevLoginButton({ next }: DevLoginButtonProps) {
  const [email, setEmail] = useState(CONTAS_DEV[0].email);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (process.env.NODE_ENV !== "development") return null;

  async function entrar() {
    setCarregando(true);
    setErro(null);
    try {
      await signInDev(email, SENHA_DEV);
      window.location.assign(next ?? "/");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no login dev");
      setCarregando(false);
    }
  }

  return (
    <div className="mt-2 w-full space-y-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3 text-left">
      <p className="text-[11px] font-semibold tracking-wide text-amber-700 uppercase">
        Atalho de desenvolvimento
      </p>
      <select
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs text-foreground"
        aria-label="Conta de teste"
      >
        {CONTAS_DEV.map((conta) => (
          <option key={conta.email} value={conta.email}>
            {conta.rotulo}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={entrar}
        disabled={carregando}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
      >
        {carregando ? "Entrando…" : "Logar em dev"}
      </button>
      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
    </div>
  );
}
