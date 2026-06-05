-- =============================================================================
-- 0006 — rodada (jornada oficial) e Destaque da Rodada
--
-- Critério de numeração de `rodada`:
--   · Fase de grupos: o número N extraído de "Matchday N" no openfootball.
--     Ex.: "Matchday 1" → 1, "Matchday 3" → 3.
--     Cada Matchday corresponde a um lote de jogos disputados simultaneamente
--     no calendário oficial, independente do grupo.
--   · Mata-mata: rodadas sequenciais imediatamente após o último Matchday dos
--     grupos, na ordem cronológica do calendário:
--       Round of 32   → maxMatchday + 1   (ex.: 18 se houver 17 Matchdays)
--       Round of 16   → maxMatchday + 2
--       Quarter-final → maxMatchday + 3
--       Semi-final    → maxMatchday + 4
--       Terceiro lugar→ maxMatchday + 5
--       Final         → maxMatchday + 6
--     Isso garante uma sequência inteira contínua de 1 até a final,
--     sem lacunas, independente de quantos Matchdays a fase de grupos tiver.
--   · A coluna é nullable: linhas antigas sem rodada preenchida (antes do
--     re-seed) não quebram constraint; o motor de destaque as ignora via
--     filtro `rodada is not null`.
-- =============================================================================

-- ============================================================= 1. coluna

alter table public.partidas
  add column rodada smallint;

-- Índice para acelerar os agregados por rodada em get_destaque_rodada().
-- Índice parcial (rodada is not null) exclui as linhas ainda não migradas.
create index idx_partidas_rodada
  on public.partidas (rodada)
  where rodada is not null;

-- ============================================================= 2. get_rodada_atual()
-- Auxiliar utilitária: retorna o número da última rodada que contém
-- pelo menos um jogo encerrado. Usado pela UI para saber qual é a rodada
-- "em exibição" quando não há parâmetro explícito.

create or replace function public.get_rodada_atual()
returns smallint
language sql
security definer stable
set search_path = public, pg_temp
as $$
  select max(rodada)::smallint
    from public.partidas
   where status  = 'encerrada'
     and rodada  is not null;
$$;

grant execute on function public.get_rodada_atual() to authenticated, anon;

-- ============================================================= 3. get_destaque_rodada()
-- Retorna o(s) participante(s) com maior soma de pontos em uma rodada.
-- Em empate, todos os líderes são devolvidos (regra "funcionário do mês").
--
-- Parâmetro p_rodada:
--   · null → usa a última rodada com jogo encerrado (via get_rodada_atual).
--   · smallint → consulta a rodada informada diretamente.
--
-- SECURITY DEFINER: lê `palpites` e `profiles` de todos os participantes
--   sem depender do RLS do chamador (palpites_select restringe leitura cruzada
--   antes do apito — anti-cola; o destaque precisa ver tudo pós-encerramento).
-- STABLE: resultado pode variar entre transações; constante dentro de uma.
--
-- Só conta jogos com status = 'encerrada' (trigger apurar_pontos já rodou).
-- Retorna conjunto vazio se a rodada não tiver nenhum jogo encerrado ainda,
-- ou se o máximo de pontos na rodada for 0 (ninguém pontuou).

create or replace function public.get_destaque_rodada(
  p_rodada smallint default null
)
returns table (
  rodada          smallint,
  participante_id uuid,
  nome            text,
  avatar_url      text,
  pontos_rodada   int
)
language sql
security definer stable
set search_path = public, pg_temp
as $$
  with
    -- Rodada alvo: parâmetro explícito ou última com jogo encerrado.
    rodada_alvo as (
      select coalesce(
        p_rodada,
        (select max(pt.rodada)::smallint
           from public.partidas pt
          where pt.status = 'encerrada'
            and pt.rodada is not null)
      ) as nr
    ),

    -- Soma de pontos por participante do bolão padrão na rodada alvo.
    -- Apenas jogos encerrados entram (trigger de apuração já processou).
    -- left join garante que participantes sem palpite na rodada não aparecem
    -- (inner join com partidas encerradas já filtra naturalmente).
    pontos_por_participante as (
      select
        pa.id                            as participante_id,
        coalesce(sum(pi.pontos), 0)::int as pts
      from      public.participantes pa
      join      public.palpites      pi  on pi.participante_id = pa.id
      join      public.partidas      pt  on pt.id              = pi.partida_id
      cross join rodada_alvo             ra
      where pa.bolao_id = '00000000-0000-0000-0000-000000000b01'
        and pt.rodada   = ra.nr           -- null = null nunca é true: seguro
        and pt.status   = 'encerrada'
        and pt.rodada   is not null       -- guard explícito para o índice parcial
      group by pa.id
    ),

    -- Pontuação máxima entre os participantes com palpite apurado na rodada.
    max_pts as (
      select max(pts) as valor
        from pontos_por_participante
    )

  select
    ra.nr                            as rodada,
    pa.id                            as participante_id,
    pr.nome,
    pr.avatar_url,
    ppp.pts                          as pontos_rodada
  from      pontos_por_participante  ppp
  cross join rodada_alvo             ra
  cross join max_pts
  join      public.participantes     pa  on pa.id  = ppp.participante_id
  join      public.profiles          pr  on pr.id  = pa.user_id
  -- Apenas quem está empatado na liderança e pontuou ao menos 1 ponto.
  -- max_pts.valor = 0 significa que ninguém acertou nada: sem destaque.
  where ppp.pts    = max_pts.valor
    and max_pts.valor > 0
  order by pr.nome;
$$;

grant execute on function public.get_destaque_rodada(smallint) to authenticated, anon;
