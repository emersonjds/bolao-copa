-- =============================================================================
-- 0003 — cada lado da partida tem um time real OU um rótulo (nunca os dois nulos)
--   Garante coerência: mandante/visitante sempre exibíveis, seja pela seleção
--   real (mandante_id) ou pelo placeholder de mata-mata (mandante_label).
-- =============================================================================

alter table public.partidas
  add constraint chk_mandante_lado_definido
  check (mandante_id is not null or mandante_label is not null);

alter table public.partidas
  add constraint chk_visitante_lado_definido
  check (visitante_id is not null or visitante_label is not null);
