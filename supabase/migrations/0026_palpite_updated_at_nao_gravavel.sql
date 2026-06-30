-- =============================================================================
-- 0026 — updated_at do palpite deixa de ser gravável pelo cliente
--
-- O grant de UPDATE (0011) incluía updated_at, e o trigger (0013) só bumpa
-- quando os gols mudam. Num UPDATE sem mudança de gols, o updated_at enviado
-- pelo cliente passava direto — dava pra forjar o timestamp de auditoria
-- (esconder edição de última hora). O app nunca envia updated_at no payload;
-- o trigger é a única fonte legítima. Removemos a coluna do grant de UPDATE.
-- =============================================================================

revoke update on table public.palpites from authenticated;
grant update (gols_mandante, gols_visitante) on table public.palpites to authenticated;
