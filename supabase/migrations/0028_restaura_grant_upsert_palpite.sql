-- =============================================================================
-- 0028 — restaura o grant de UPDATE das colunas de conflito do upsert
--
-- A 0026 quis remover apenas `updated_at` do grant de UPDATE (impedir forja do
-- timestamp de auditoria), mas fez `revoke update on table` + `grant update
-- (gols_mandante, gols_visitante)` — derrubando junto `participante_id` e
-- `partida_id`. O PostgREST inclui as colunas de conflito no SET do
-- ON CONFLICT DO UPDATE, então editar um palpite existente passou a falhar com
-- 42501 (permission denied for table palpites) em produção.
--
-- Restauramos só as colunas de conflito. `updated_at` segue FORA do grant
-- (ganho da 0026 preservado: continua não-forjável, o trigger 0013 é a única
-- fonte). `pontos` nunca esteve no grant. A integridade do dono é garantida
-- pela policy palpites_update_own (WITH CHECK).
-- =============================================================================

grant update (participante_id, partida_id, gols_mandante, gols_visitante)
  on table public.palpites to authenticated;
