import { getSupabaseBrowserClient } from "@/shared/lib/supabase";
import type { FaseCopa } from "@/entities/partida";

// True quando existe ao menos uma partida da fase com mandante e visitante reais.
// Serve de gatilho para exibir o aviso de fase só depois que há o que palpitar.
// Falha de leitura é silenciosa.
export async function faseDefinida(fase: FaseCopa): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("partidas")
    .select("id")
    .eq("fase", fase)
    .not("mandante_id", "is", null)
    .not("visitante_id", "is", null)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export const mataMataDefinido = (): Promise<boolean> => faseDefinida("trinta-e-dois");
