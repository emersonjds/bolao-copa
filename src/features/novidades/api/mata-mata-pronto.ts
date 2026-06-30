import { getSupabaseBrowserClient } from "@/shared/lib/supabase";

/**
 * True quando os confrontos do trinta-e-dois já foram definidos — isto é, existe
 * ao menos um jogo dessa fase com mandante e visitante reais (não mais o
 * placeholder "2A"/"1B"). Serve de gatilho para o aviso "Começou o mata-mata!"
 * só aparecer depois que há o que palpitar. Falha de leitura é silenciosa.
 */
export async function mataMataDefinido(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("partidas")
    .select("id")
    .eq("fase", "trinta-e-dois")
    .not("mandante_id", "is", null)
    .not("visitante_id", "is", null)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}
