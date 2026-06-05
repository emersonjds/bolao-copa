"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth, useIsAdmin } from "@/features/auth";
import { AdminContent } from "@/features/admin";

/**
 * Rota protegida /admin.
 *
 * Fluxo de acesso:
 * 1. Enquanto a sessão Supabase carrega → skeleton de carregamento.
 * 2. Sem sessão (user = null) → redirect para "/" + toast de erro.
 * 3. Com sessão mas sem is_admin → aguarda a query de perfil (que usa o mesmo
 *    cache de useIsAdmin) e redireciona após 800ms caso não seja admin.
 * 4. is_admin = true → renderiza AdminContent.
 *
 * O timer de 800ms garante que a query de profiles (staleTime: Infinity)
 * tenha tempo de resolver antes de decidir redirecionar um admin legítimo
 * em sessão recém-iniciada.
 */
export default function AdminPage() {
  const { loading: authLoading, user } = useAuth();
  const isAdmin = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    // Aguarda o carregamento inicial da sessão Supabase.
    if (authLoading) return;

    // Sem sessão → redireciona imediatamente.
    if (!user) {
      toast.error("Acesso restrito.");
      router.replace("/");
      return;
    }

    // Usuário logado mas isAdmin ainda pode ser false enquanto a query de
    // profiles carrega. Aguarda até 800ms antes de redirecionar.
    if (!isAdmin) {
      const timer = window.setTimeout(() => {
        // Re-verifica dentro do timeout; o closure captura o valor atual.
        // Se isAdmin virou true antes disso, o effect terá sido limpo.
        toast.error("Acesso restrito.");
        router.replace("/");
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, [authLoading, user, isAdmin, router]);

  // ---- Estados de UI ----

  // Auth ainda carregando.
  if (authLoading) {
    return <AdminPageSkeleton />;
  }

  // Sem sessão: redirect em andamento.
  if (!user) {
    return null;
  }

  // Sessão existe mas admin não confirmado: mostra skeleton enquanto a query
  // de profiles resolve (ou o timer dispara e redireciona).
  if (!isAdmin) {
    return <AdminPageSkeleton />;
  }

  return <AdminContent />;
}

// ---------------------------------------------------------------------------
// Skeleton de página (carregamento / verificação de acesso)
// ---------------------------------------------------------------------------

function AdminPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Verificando acesso...">
      {/* Header skeleton */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-44 animate-pulse rounded-xl bg-muted" aria-hidden="true" />
          <div className="h-5 w-12 animate-pulse rounded-full bg-muted" aria-hidden="true" />
        </div>
        <div className="h-4 w-48 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
      </div>

      {/* Filtros skeleton */}
      <div className="flex gap-2">
        <div className="h-11 w-28 animate-pulse rounded-full bg-muted" aria-hidden="true" />
        <div className="h-11 w-28 animate-pulse rounded-full bg-muted" aria-hidden="true" />
      </div>

      {/* Cards skeleton */}
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <li
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-border bg-card"
            aria-hidden="true"
          />
        ))}
      </ul>
    </div>
  );
}
