"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { AVISO_ATUAL } from "../model/aviso-atual";
import { avisoFoiVisto, marcarAvisoVisto } from "../api/avisos-fetcher";
import { avisoVistoLocal, marcarAvisoVistoLocal } from "../lib/aviso-local";
import { ModalNovidades } from "./modal-novidades";

/**
 * Decide se o modal de novidades aparece. Logado: fonte de verdade no banco
 * (avisos_vistos). Anônimo: fallback localStorage. Falhas de leitura/escrita
 * são silenciosas — o aviso é informativo, não crítico.
 */
export function NovidadesGate() {
  const [aberto, setAberto] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function decidir(): Promise<void> {
      // getSession lê a sessão local (sem rede) e é definitiva — diferente do
      // useSupabaseUser, que retorna null tanto carregando quanto anônimo.
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      const id = data.session?.user?.id ?? null;
      if (cancelado) return;
      setUserId(id);

      if (id) {
        try {
          const visto = await avisoFoiVisto(id, AVISO_ATUAL.id);
          if (!cancelado && !visto) setAberto(true);
        } catch {
          /* silencioso */
        }
      } else if (!avisoVistoLocal(AVISO_ATUAL.id)) {
        setAberto(true);
      }
    }

    void decidir();
    return () => {
      cancelado = true;
    };
  }, []);

  async function fechar(): Promise<void> {
    setAberto(false);
    if (userId) {
      try {
        await marcarAvisoVisto(userId, AVISO_ATUAL.id);
      } catch {
        /* silencioso */
      }
    } else {
      marcarAvisoVistoLocal(AVISO_ATUAL.id);
    }
  }

  if (!aberto) return null;
  return <ModalNovidades aviso={AVISO_ATUAL} onFechar={() => void fechar()} />;
}
