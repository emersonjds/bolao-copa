-- =============================================================================
-- 0035 — Craque do Dia (destaque por dia de jogo, em horário de Brasília).
--
-- A numeração de `rodada` (0006) trata cada FASE do mata-mata como UMA rodada
-- (32-avos = 18, oitavas = 19, ...). Como uma fase se estende por vários dias,
-- o "Craque da Rodada" acumulava os pontos de todos esses dias — não mostrava
-- "os melhores de hoje". Aqui o destaque passa a ser por DIA de calendário.
--
-- O dia é o do fuso de Brasília (America/Sao_Paulo): um jogo às 22h BRT
-- (01h UTC do dia seguinte) conta no dia BRT em que foi disputado.
-- As funções por rodada (0006) ficam no banco, mas não são mais usadas pela UI.
-- =============================================================================

create or replace function public.get_dia_atual()
returns date
language sql security definer stable
set search_path = public, pg_temp
as $$
  select max((data_hora at time zone 'America/Sao_Paulo')::date)
    from public.partidas
   where status = 'encerrada';
$$;

grant execute on function public.get_dia_atual() to authenticated, anon;

-- Retorna o(s) participante(s) com maior soma de pontos no dia.
-- Empate na liderança devolve uma linha por participante (regra "craque do dia").
-- p_data null → usa o dia do jogo encerrado mais recente (em BRT).
-- SECURITY DEFINER: precisa somar palpites de todos pós-encerramento (RLS de
-- palpites restringe leitura cruzada antes do apito; aqui só entram encerrados).
create or replace function public.get_destaque_dia(
  p_data date default null
)
returns table (
  dia             date,
  participante_id uuid,
  nome            text,
  avatar_url      text,
  pontos_dia      int
)
language sql security definer stable
set search_path = public, pg_temp
as $$
  with
    dia_alvo as (
      select coalesce(
        p_data,
        (select max((data_hora at time zone 'America/Sao_Paulo')::date)
           from public.partidas where status = 'encerrada')
      ) as d
    ),
    pontos_por_participante as (
      select
        pa.id                            as participante_id,
        coalesce(sum(pi.pontos), 0)::int as pts
      from      public.participantes pa
      join      public.palpites      pi  on pi.participante_id = pa.id
      join      public.partidas      pt  on pt.id              = pi.partida_id
      cross join dia_alvo                da
      where pa.bolao_id = '00000000-0000-0000-0000-000000000b01'
        and pt.status   = 'encerrada'
        and (pt.data_hora at time zone 'America/Sao_Paulo')::date = da.d
      group by pa.id
    ),
    max_pts as (
      select max(pts) as valor from pontos_por_participante
    )
  select
    da.d                             as dia,
    pa.id                            as participante_id,
    pr.nome,
    pr.avatar_url,
    ppp.pts                          as pontos_dia
  from      pontos_por_participante  ppp
  cross join dia_alvo                da
  cross join max_pts
  join      public.participantes     pa  on pa.id = ppp.participante_id
  join      public.profiles          pr  on pr.id = pa.user_id
  where ppp.pts     = max_pts.valor
    and max_pts.valor > 0
  order by pr.nome;
$$;

grant execute on function public.get_destaque_dia(date) to authenticated, anon;
