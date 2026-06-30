-- =============================================================================
-- 0017 — desempate do ranking
--
-- A tela de Regras promete desempate por: placares cravados → resultados certos
-- → ordem alfabética. A get_ranking (0005) só desempatava por jogos_pontuados.
-- Aqui alinhamos o código ao que a UI já diz.
--
-- A assinatura (RETURNS TABLE) fica IGUAL — os critérios de desempate entram
-- apenas no ORDER BY (agregados não precisam estar no SELECT). Join 1:1 com
-- partidas encerradas; não altera sum(pontos) nem count(jogos_pontuados).
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
    pa.id                            as participante_id,
    pr.nome,
    pr.avatar_url,
    coalesce(sum(pi.pontos), 0)::int as pontos_totais,
    count(pi.pontos)::int            as jogos_pontuados
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
    coalesce(sum(pi.pontos), 0) desc,
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
