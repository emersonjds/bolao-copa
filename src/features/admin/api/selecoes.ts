"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { Selecao } from "@/entities/partida";

interface SelecaoDb {
  id: string;
  nome: string;
  codigo: string;
}

async function listarSelecoes(): Promise<Selecao[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("selecoes")
    .select("id, nome, codigo")
    .order("nome");

  if (error) {
    throw new Error(`Falha ao carregar seleções: ${error.message}`);
  }

  return (data as unknown as SelecaoDb[]).map((row) => ({
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
  }));
}

/** staleTime: Infinity — seleções não mudam durante a Copa. */
export function useSelecoes() {
  return useQuery({
    queryKey: ["selecoes"],
    queryFn: listarSelecoes,
    staleTime: Infinity,
  });
}
