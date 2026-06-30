-- =============================================================================
-- 0034 — apuração por fase. Grupos seguem 5/4/3/2/0 (0015). Mata-mata passa a
-- valer "quem avança": 5 (cravou vitória + quem passa), 4 (cravou empate + quem
-- passa), 3 (acertou quem passa), 0 (errou quem passa) — tudo × peso_fase.
-- Pênaltis/prorrogação contam só para definir quem avança (vencedor_penaltis).
-- =============================================================================

create or replace function public.apurar_pontos()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  res_real int;
  peso int;
  avanca_real uuid;
  empate_real boolean;
begin
  if new.status <> 'encerrada'
     or new.gols_mandante is null or new.gols_visitante is null then
    return new;
  end if;

  peso := public.peso_fase(new.fase);

  if new.fase = 'grupos' then
    res_real := case
      when new.gols_mandante > new.gols_visitante then  1
      when new.gols_mandante < new.gols_visitante then -1
      else 0 end;
    update public.palpites pal
       set pontos = peso * (case
             when pal.gols_mandante = new.gols_mandante and pal.gols_visitante = new.gols_visitante
               then case when res_real = 0 then 4 else 5 end
             when case
                    when pal.gols_mandante > pal.gols_visitante then  1
                    when pal.gols_mandante < pal.gols_visitante then -1
                    else 0 end = res_real
               then case when res_real = 0 then 2 else 3 end
             else 0 end)
     where pal.partida_id = new.id;
    return new;
  end if;

  -- mata-mata: quem avança é rei
  empate_real := new.gols_mandante = new.gols_visitante;
  avanca_real := case
    when new.gols_mandante > new.gols_visitante then new.mandante_id
    when new.gols_visitante > new.gols_mandante then new.visitante_id
    else new.vencedor_penaltis end;

  if avanca_real is null then
    return new; -- empate no 90' sem vencedor definido: não resolvido, não pontua
  end if;

  update public.palpites pal
     set pontos = peso * (case
           when (case
                   when pal.gols_mandante > pal.gols_visitante then new.mandante_id
                   when pal.gols_visitante > pal.gols_mandante then new.visitante_id
                   else pal.vencedor_avanca end) = avanca_real
             then case
                    when pal.gols_mandante = new.gols_mandante
                     and pal.gols_visitante = new.gols_visitante
                      then case when empate_real then 4 else 5 end
                    else 3 end
           else 0 end)
   where pal.partida_id = new.id;

  return new;
end; $$;

-- ============================================================= re-apuração
-- Reescreve pontos dos jogos de mata-mata já encerrados pela regra nova.
-- Grupos não mudam. Set-based e idempotente.
update public.palpites pal
   set pontos = public.peso_fase(pt.fase) * (case
         when (case
                 when pal.gols_mandante > pal.gols_visitante then pt.mandante_id
                 when pal.gols_visitante > pal.gols_mandante then pt.visitante_id
                 else pal.vencedor_avanca end) =
              (case
                 when pt.gols_mandante > pt.gols_visitante then pt.mandante_id
                 when pt.gols_visitante > pt.gols_mandante then pt.visitante_id
                 else pt.vencedor_penaltis end)
           then case
                  when pal.gols_mandante = pt.gols_mandante
                   and pal.gols_visitante = pt.gols_visitante
                    then case when pt.gols_mandante = pt.gols_visitante then 4 else 5 end
                  else 3 end
         else 0 end)
  from public.partidas pt
 where pt.id = pal.partida_id
   and pt.fase <> 'grupos'
   and pt.status = 'encerrada'
   and pt.gols_mandante is not null
   and pt.gols_visitante is not null
   and (case
          when pt.gols_mandante > pt.gols_visitante then pt.mandante_id
          when pt.gols_visitante > pt.gols_mandante then pt.visitante_id
          else pt.vencedor_penaltis end) is not null;
