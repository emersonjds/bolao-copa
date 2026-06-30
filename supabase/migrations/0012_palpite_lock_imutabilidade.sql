-- HARDENING (achado do red-team sobre a 0011): ao incluir partida_id e
-- participante_id no GRANT de UPDATE (necessário porque o PostgREST os coloca no
-- SET do ON CONFLICT DO UPDATE), abriu-se uma evasão da trava de horário.
--
-- O bypass do trigger "gols inalterados -> libera sem checar o apito" foi escrito
-- para a apuração (que mexe só em pontos). Com partida_id agora editável, um
-- usuário autenticado podia trocar o partida_id de um palpite perdido para um
-- jogo FUTURO mantendo os mesmos gols: o trigger via gols iguais e liberava sem
-- checar o kickoff de origem nem de destino. Resultado: "teleportar" palpite e
-- ganhar pontos indevidos.
--
-- Fix: tornar participante_id e partida_id IMUTÁVEIS no UPDATE, ANTES do bypass
-- da apuração. O upsert legítimo escreve os mesmos valores (new = old), então
-- não é afetado; a apuração nunca toca nesses campos. Só o ataque (new <> old)
-- é bloqueado.

create or replace function public.enforce_palpite_lock()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  kickoff timestamptz;
begin
  -- Campos estruturais são imutáveis após a criação. Nem o app (upsert escreve
  -- new = old) nem a apuração os alteram — só uma tentativa de fraude faria.
  if tg_op = 'UPDATE' then
    if new.participante_id is distinct from old.participante_id then
      raise exception 'participante_id é imutável após a criação do palpite';
    end if;
    if new.partida_id is distinct from old.partida_id then
      raise exception 'partida_id é imutável após a criação do palpite';
    end if;
  end if;

  -- Apuração: gols inalterados => só pontos/updated_at mudaram. Liberado sem
  -- checar o apito (participante_id e partida_id já foram validados acima).
  if tg_op = 'UPDATE'
     and new.gols_mandante is not distinct from old.gols_mandante
     and new.gols_visitante is not distinct from old.gols_visitante then
    return new;
  end if;

  -- Trava de horário: INSERT, ou UPDATE que muda os gols, exige apito não dado.
  select data_hora into kickoff from public.partidas where id = new.partida_id;
  if kickoff is null then
    raise exception 'Partida inexistente';
  end if;
  if now() >= kickoff then
    raise exception 'Palpite encerrado: a partida já começou';
  end if;
  return new;
end;
$$;
