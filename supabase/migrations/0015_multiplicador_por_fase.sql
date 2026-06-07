-- =============================================================================
-- 0015 — multiplicador de pontos por fase
--
-- A base de pontos continua 5/4/3/2/0 (definida na 0014), mas agora é
-- MULTIPLICADA por um peso que cresce no mata-mata, deixando o bolão
-- competitivo até a final (dá pra virar na reta final):
--
--   fase inicial (grupos, 32-avos, 3º lugar) → ×1
--   mata-mata    (oitavas, quartas)          → ×2
--   decisão      (semifinal, final)          → ×3
--
-- Ex.: cravar o placar de uma vitória vale 5 nos grupos, 10 nas quartas e
-- 15 na final. Pênaltis continuam não contando (vale o tempo normal).
-- =============================================================================

-- ============================================================= peso por fase
create or replace function public.peso_fase(fase text)
returns int
language sql
immutable
as $$
  select case fase
    when 'oitavas' then 2
    when 'quartas' then 2
    when 'semifinal' then 3
    when 'final' then 3
    else 1 -- grupos, trinta-e-dois, terceiro-lugar
  end;
$$;

-- ============================================================= apuração de pontos
-- Mesma assinatura/trigger; só multiplicamos a base pelo peso da fase.
create or replace function public.apurar_pontos()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  res_real int;  -- 1 = mandante vence, 0 = empate, -1 = visitante vence
  peso int;
begin
  if new.status <> 'encerrada'
     or new.gols_mandante is null
     or new.gols_visitante is null then
    return new;
  end if;

  res_real := case
    when new.gols_mandante > new.gols_visitante then  1
    when new.gols_mandante < new.gols_visitante then -1
    else 0
  end;
  peso := public.peso_fase(new.fase);

  update public.palpites pal
     set pontos = peso * (case
           -- placar exato: 5 se foi vitória, 4 se foi empate
           when pal.gols_mandante = new.gols_mandante
            and pal.gols_visitante = new.gols_visitante
             then case when res_real = 0 then 4 else 5 end

           -- resultado certo, placar errado: 3 se foi vitória, 2 se foi empate
           when case
                  when pal.gols_mandante > pal.gols_visitante then  1
                  when pal.gols_mandante < pal.gols_visitante then -1
                  else 0
                end = res_real
             then case when res_real = 0 then 2 else 3 end

           -- 0 pts: resultado errado
           else 0
         end)
   where pal.partida_id = new.id;

  return new;
end;
$$;

-- ============================================================= backfill
-- Reapura partidas já encerradas com o novo peso. Set-based e idempotente.
update public.palpites pal
   set pontos = public.peso_fase(pt.fase) * (case
         when pal.gols_mandante = pt.gols_mandante
          and pal.gols_visitante = pt.gols_visitante
           then case when pt.gols_mandante = pt.gols_visitante then 4 else 5 end
         when case
                when pal.gols_mandante > pal.gols_visitante then  1
                when pal.gols_mandante < pal.gols_visitante then -1
                else 0
              end =
              case
                when pt.gols_mandante > pt.gols_visitante then  1
                when pt.gols_mandante < pt.gols_visitante then -1
                else 0
              end
           then case when pt.gols_mandante = pt.gols_visitante then 2 else 3 end
         else 0
       end)
  from public.partidas pt
 where pt.id = pal.partida_id
   and pt.status = 'encerrada'
   and pt.gols_mandante is not null
   and pt.gols_visitante is not null;
