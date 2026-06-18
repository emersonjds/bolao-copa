-- =============================================================================
-- 0027 — search_path fixo nas funções de janela do palpite
--
-- janela_palpite_inicio e janela_inicio (0019) não fixaram search_path, ao
-- contrário do hardening da 0016. São SQL puro sem acesso a tabela (risco
-- baixo de hijack), mas alinhamos por consistência/defense-in-depth: uma futura
-- função SECURITY DEFINER que as chame não herda um search_path do chamador.
-- create or replace preserva os grants existentes (0019).
-- =============================================================================

create or replace function public.janela_palpite_inicio(p_data_hora timestamptz)
returns timestamptz
language sql
stable
set search_path = public, pg_temp
as $$
  select date_trunc('day', p_data_hora at time zone 'America/Sao_Paulo')
           at time zone 'America/Sao_Paulo';
$$;

create or replace function public.janela_inicio(public.partidas)
returns timestamptz
language sql
stable
set search_path = public, pg_temp
as $$
  select public.janela_palpite_inicio($1.data_hora);
$$;
