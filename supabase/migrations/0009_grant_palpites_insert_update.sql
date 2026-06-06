-- Mesmo padrão da 0008: a 0001 define as policies "palpites_insert_own" e
-- "palpites_update_own" E os grants de coluna, mas a 0001 foi aplicada no banco
-- sem esses grants (foram adicionados ao arquivo depois; migration já aplicada
-- não re-roda). Resultado: salvar palpite (upsert = INSERT/UPDATE) falha com
-- "permission denied for table palpites", mesmo com as policies presentes.
--
-- Policy sem grant = acesso negado. Aqui re-aplicamos os grants de coluna,
-- mantendo `pontos` e `id` blindados (cliente nunca escreve pontuação).
-- Idempotente: se os grants já existirem, re-conceder não causa efeito colateral.
revoke insert, update on table public.palpites from authenticated;

grant insert (participante_id, partida_id, gols_mandante, gols_visitante)
  on table public.palpites to authenticated;

grant update (gols_mandante, gols_visitante, updated_at)
  on table public.palpites to authenticated;
