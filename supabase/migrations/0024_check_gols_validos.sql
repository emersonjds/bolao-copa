-- =============================================================================
-- 0024 — validação de range de gols no servidor (não confiar no cliente)
--
-- O clamp 0–20 só existia no front; via API direta ou localStorage adulterado
-- dava pra gravar gols negativos/absurdos no banco. CHECK fecha a borda no
-- servidor (princípio: todo input externo é não confiável até validado).
-- Limite generoso (0..99) — a UI continua em 0–20.
-- =============================================================================

alter table public.palpites
  add constraint palpites_gols_validos
  check (gols_mandante between 0 and 99 and gols_visitante between 0 and 99);

-- partidas: gols são nuláveis (jogo agendado/ao-vivo sem placar ainda).
alter table public.partidas
  add constraint partidas_gols_validos
  check (
    (gols_mandante is null or gols_mandante between 0 and 99)
    and (gols_visitante is null or gols_visitante between 0 and 99)
  );
