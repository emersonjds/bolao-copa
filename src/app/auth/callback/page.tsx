"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";

/**
 * Retorno do OAuth: o Google manda de volta para cá com `?code=...`.
 * Trocamos o código pela sessão (PKCE) e redirecionamos para `next` (ou home).
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next") ?? "/";

    if (!code) {
      router.replace(next);
      return;
    }

    getSupabaseBrowserClient()
      .auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setErro("Não foi possível concluir o login. Tente novamente.");
          return;
        }
        router.replace(next);
      });
  }, [router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-medium text-foreground">{erro ?? "Entrando..."}</p>
      {erro && (
        <Link href="/" className="text-sm font-semibold text-brand-700 underline">
          Voltar ao início
        </Link>
      )}
    </div>
  );
}
