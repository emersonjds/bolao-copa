-- =============================================================================
-- 0037 — palpite só nos jogos de hoje + o próximo dia com jogos (regra de servidor)
--
-- Até aqui o "hoje + amanhã" era só apresentação no cliente (0021 removeu a
-- borda inferior; o servidor aceitava palpite em QUALQUER jogo futuro antes do
-- apito). Um request forjado conseguia palpitar jogos distantes.
--
-- Agora o servidor recusa palpite em jogo cujo dia (fuso BRT) seja depois do
-- "próximo dia com jogos" — espelha filtrarHojeEProximoDia no cliente:
--   permitido = dia do jogo é HOJE, ou é o menor dia futuro que tem jogo.
--
-- Mantém tudo da 0021: imutabilidade de participante_id/partida_id, o bypass da
-- apuração (gols inalterados) e a borda superior (trava no apito).
-- =============================================================================

create or replace function public.enforce_palpite_lock()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  kickoff     timestamptz;
  dia_jogo    date;
  hoje        date;
  proximo_dia date;
begin
  if tg_op = 'UPDATE' then
    if new.participante_id is distinct from old.participante_id then
      raise exception 'participante_id é imutável após a criação do palpite';
    end if;
    if new.partida_id is distinct from old.partida_id then
      raise exception 'partida_id é imutável após a criação do palpite';
    end if;
  end if;

  -- Apuração: gols inalterados => só pontos/updated_at mudaram. Liberado.
  if tg_op = 'UPDATE'
     and new.gols_mandante is not distinct from old.gols_mandante
     and new.gols_visitante is not distinct from old.gols_visitante then
    return new;
  end if;

  select data_hora into kickoff from public.partidas where id = new.partida_id;
  if kickoff is null then
    raise exception 'Partida inexistente';
  end if;

  -- Borda superior (apito): partida já começou.
  if now() >= kickoff then
    raise exception 'Palpite encerrado: a partida já começou';
  end if;

  -- Borda superior de DIA: hoje + o próximo dia com jogos (fuso BRT).
  dia_jogo := (kickoff at time zone 'America/Sao_Paulo')::date;
  hoje     := (now()   at time zone 'America/Sao_Paulo')::date;
  if dia_jogo > hoje then
    select min((data_hora at time zone 'America/Sao_Paulo')::date)
      into proximo_dia
      from public.partidas
     where (data_hora at time zone 'America/Sao_Paulo')::date > hoje;
    if proximo_dia is null or dia_jogo > proximo_dia then
      raise exception
        'Palpite ainda não liberado: só é possível palpitar nos jogos de hoje e do próximo dia';
    end if;
  end if;

  return new;
end;
$$;
