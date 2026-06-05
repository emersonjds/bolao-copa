"use client";

import { useEffect, useState, type ReactNode } from "react";

interface MockProviderProps {
  children: ReactNode;
}

function shouldStartMsw(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_MSW !== "false";
}

/**
 * Inicializa o MSW Service Worker como fonte de dados.
 *
 * Ligado por padrão em dev E em produção (o backend ainda não existe — o MSW
 * é a fonte de dados do app estático). Quando o BFF subir, defina
 * NEXT_PUBLIC_ENABLE_MSW=false e NEXT_PUBLIC_API_URL para usar a API real;
 * o worker deixa de ser importado.
 *
 * Bloqueia o render até o worker estar pronto para evitar race com as
 * primeiras requisições do React Query.
 */
export function MockProvider({ children }: MockProviderProps) {
  const [isReady, setIsReady] = useState<boolean>(() => !shouldStartMsw());

  useEffect(() => {
    if (isReady) return;

    let cancelled = false;
    import("./browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass" }).then(() => {
        if (!cancelled) setIsReady(true);
      })
    );

    return () => {
      cancelled = true;
    };
  }, [isReady]);

  if (!isReady) return null;
  return <>{children}</>;
}
