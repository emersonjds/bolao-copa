-- =============================================================================
-- 0025 — ranking só conta pontos de partidas encerradas
--
-- get_ranking (0017) somava palpites.pontos direto, sem amarrar ao status da
-- partida. Se um admin encerrava (apurava os pontos) e depois revertia o status
-- para ao-vivo/agendada, o trigger de apuração não dispara de novo e os pontos
-- residuais continuavam inflando o total até re-encerrar. Aqui a soma e a
-- contagem passam a considerar só palpites cuja partida está de fato encerrada
-- (o mesmo gate por pt.id que o desempate já usa). Assinatura inalterada.
-- =============================================================================

create or replace function public.get_ranking()
returns table (
  participante_id uuid,
  nome            text,
  avatar_url      text,
  pontos_totais   int,
  jogos_pontuados int
)
language sql
security definer stable
set search_path = public, pg_temp
as $$
  select
    pa.id                                                              as participante_id,
    pr.nome,
    pr.avatar_url,
    coalesce(sum(pi.pontos) filter (where pt.id is not null), 0)::int  as pontos_totais,
    (count(pi.pontos) filter (where pt.id is not null))::int           as jogos_pontuados
  from      public.participantes pa
  join      public.profiles pr on pr.id = pa.user_id
  left join public.palpites  pi on pi.participante_id = pa.id
  left join public.partidas  pt on pt.id = pi.partida_id
                                and pt.status = 'encerrada'
                                and pt.gols_mandante is not null
                                and pt.gols_visitante is not null
  where pa.bolao_id = '00000000-0000-0000-0000-000000000b01'
  group by pa.id, pr.nome, pr.avatar_url
  order by
    coalesce(sum(pi.pontos) filter (where pt.id is not null), 0) desc,
    -- 1º desempate: placares cravados (palpite = placar exato)
    count(*) filter (
      where pt.id is not null
        and pi.gols_mandante = pt.gols_mandante
        and pi.gols_visitante = pt.gols_visitante
    ) desc,
    -- 2º desempate: resultados certos (acertou o vencedor ou o empate)
    count(*) filter (
      where pt.id is not null
        and (case
               when pi.gols_mandante > pi.gols_visitante then 1
               when pi.gols_mandante < pi.gols_visitante then -1
               else 0
             end)
          = (case
               when pt.gols_mandante > pt.gols_visitante then 1
               when pt.gols_mandante < pt.gols_visitante then -1
               else 0
             end)
    ) desc,
    -- 3º desempate: ordem alfabética
    pr.nome asc;
$$;
