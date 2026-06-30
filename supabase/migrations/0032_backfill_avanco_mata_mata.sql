-- =============================================================================
-- 0032 — backfill do auto-avanço para jogos encerrados antes da 0029
--
-- O trigger avancar_mata_mata() (0029) só preenche o próximo confronto quando
-- um jogo é ENCERRADO via UPDATE. Jogos do mata-mata já encerrados antes da
-- 0029 nunca dispararam o avanço, deixando as fases seguintes com
-- mandante_id/visitante_id nulos (aparecem como "Vencedor N" no chaveamento).
--
-- Este backfill aplica a mesma regra retroativamente, em ordem de numero (para
-- cobrir cadeias 32-avos → oitavas → ...). Mexe só nos ids dos confrontos
-- seguintes — não toca pontuação. Idempotente.
-- =============================================================================

do $$
declare
  jogo  record;
  venc  uuid;
  perd  uuid;
begin
  for jogo in
    select numero, mandante_id, visitante_id, gols_mandante, gols_visitante, vencedor_penaltis
      from public.partidas
     where numero is not null
       and status = 'encerrada'
       and gols_mandante is not null
       and gols_visitante is not null
     order by numero
  loop
    venc := case
      when jogo.gols_mandante > jogo.gols_visitante then jogo.mandante_id
      when jogo.gols_visitante > jogo.gols_mandante then jogo.visitante_id
      else jogo.vencedor_penaltis
    end;

    -- empate sem vencedor_penaltis: aguarda correção do placar
    if venc is null then continue; end if;

    perd := case when venc = jogo.mandante_id then jogo.visitante_id else jogo.mandante_id end;

    update public.partidas set mandante_id  = venc where mandante_label  = 'W' || jogo.numero;
    update public.partidas set visitante_id = venc where visitante_label = 'W' || jogo.numero;
    update public.partidas set mandante_id  = perd where mandante_label  = 'L' || jogo.numero;
    update public.partidas set visitante_id = perd where visitante_label = 'L' || jogo.numero;
  end loop;
end $$;
