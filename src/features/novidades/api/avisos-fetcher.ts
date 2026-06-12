import { getSupabaseBrowserClient } from "@/shared/lib/supabase";

/** Já viu (e fechou) este aviso? Consulta a tabela avisos_vistos do próprio usuário. */
export async function avisoFoiVisto(userId: string, avisoId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("avisos_vistos")
    .select("aviso_id")
    .eq("user_id", userId)
    .eq("aviso_id", avisoId)
    .limit(1);

  if (error) throw new Error(`Falha ao verificar aviso: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/** Marca o aviso como visto. Upsert para ser idempotente (fechar de novo não erra). */
export async function marcarAvisoVisto(userId: string, avisoId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("avisos_vistos")
    .upsert({ user_id: userId, aviso_id: avisoId }, { onConflict: "user_id,aviso_id" });

  if (error) throw new Error(`Falha ao marcar aviso: ${error.message}`);
}
