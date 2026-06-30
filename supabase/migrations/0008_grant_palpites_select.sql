-- palpites tem a policy RLS "palpites_select", mas nunca recebeu o GRANT SELECT
-- para o papel authenticated. Policy sem grant resulta em
-- "permission denied for table palpites" na leitura. A visibilidade das linhas
-- continua controlada pela policy (próprios palpites + partidas já iniciadas).
grant select on table public.palpites to authenticated;
