"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import { type Aviso, type Gatilho, AVISOS } from "../model/aviso-atual";
import { avisoFoiVisto, marcarAvisoVisto } from "../api/avisos-fetcher";
import { mataMataDefinido } from "../api/fase-pronta";
import { avisoVistoLocal, marcarAvisoVistoLocal } from "../lib/aviso-local";
import { ModalNovidades } from "./modal-novidades";

// Cada gatilho de aviso mapeia para a consulta que diz se já está disponível.
const VERIFICAR_GATILHO: Record<Gatilho, () => Promise<boolean>> = {
  "mata-mata-definido": mataMataDefinido,
};

/**
 * Itera AVISOS em ordem e retorna o primeiro não visto cujo gatilho já está
 * disponível, ou null. jaVistos: IDs já dispensados nesta sessão (evita
 * re-consultar o banco). Falhas de leitura são silenciosas — aviso informativo.
 */
async function encontrarProximo(
  userId: string | null,
  jaVistos: Set<string>,
): Promise<Aviso | null> {
  for (const aviso of AVISOS) {
    if (jaVistos.has(aviso.id)) continue;

    let naoVisto: boolean;
    if (userId) {
      try {
        naoVisto = !(await avisoFoiVisto(userId, aviso.id));
      } catch {
        return null; // silencioso
      }
    } else {
      naoVisto = !avisoVistoLocal(aviso.id);
    }
    if (!naoVisto) continue;

    // Não visto: só exibe quando o gatilho de dados já está disponível.
    if (aviso.gatilho && !(await VERIFICAR_GATILHO[aviso.gatilho]())) continue;

    return aviso;
  }
  return null;
}

export function NovidadesGate() {
  const [avisoAtivo, setAvisoAtivo] = useState<Aviso | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // ponytail: in-session dismissed IDs — evita re-consultar o banco para avisos já fechados
  const [vistos, setVistos] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelado = false;

    async function iniciar(): Promise<void> {
      // getSession lê a sessão local (sem rede) e é definitiva — diferente do
      // useSupabaseUser, que retorna null tanto carregando quanto anônimo.
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      const id = data.session?.user?.id ?? null;
      if (cancelado) return;
      setUserId(id);
      const proximo = await encontrarProximo(id, new Set());
      if (!cancelado) setAvisoAtivo(proximo);
    }

    void iniciar();
    return () => {
      cancelado = true;
    };
  }, []);

  async function fechar(): Promise<void> {
    if (!avisoAtivo) return;
    const fechado = avisoAtivo;
    const novosVistos = new Set([...vistos, fechado.id]);
    setVistos(novosVistos);
    setAvisoAtivo(null);

    if (userId) {
      try {
        await marcarAvisoVisto(userId, fechado.id);
      } catch {
        /* silencioso */
      }
    } else {
      marcarAvisoVistoLocal(fechado.id);
    }

    const proximo = await encontrarProximo(userId, novosVistos);
    setAvisoAtivo(proximo);
  }

  if (!avisoAtivo) return null;
  return <ModalNovidades aviso={avisoAtivo} onFechar={() => void fechar()} />;
}
