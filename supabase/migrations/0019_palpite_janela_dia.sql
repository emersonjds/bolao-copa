-- Mecânica "palpite dia a dia": além da trava no apito (borda superior, 0012),
-- o palpite só é aceito a partir da MEIA-NOITE (horário de Brasília) do dia do
-- jogo (borda inferior). Janela válida: [janela_inicio, data_hora).
--
-- "O dia" é sempre America/Sao_Paulo (público BR; a Copa tem vários fusos nos
-- EUA/MEX/CAN). Zona nomeada, nunca offset fixo, por robustez a DST.

-- 1) Função canônica: meia-noite BRT do dia da partida, como instante.
create or replace function public.janela_palpite_inicio(p_data_hora timestamptz)
returns timestamptz
language sql
immutable
as $$
  select date_trunc('day', p_data_hora at time zone 'America/Sao_Paulo')
           at time zone 'America/Sao_Paulo';
$$;

-- 2) Coluna computada (PostgREST): expõe janela_inicio nos selects de partidas
--    SEM quebrar os embeds (joins a selecoes só funcionam na tabela base).
create or replace function public.janela_inicio(public.partidas)
returns timestamptz
language sql
stable
as $$
  select public.janela_palpite_inicio($1.data_hora);
$$;

grant execute on function public.janela_palpite_inicio(timestamptz) to authenticated, anon;
grant execute on function public.janela_inicio(public.partidas) to authenticated, anon;

-- 3) Trava: adiciona a borda inferior à função existente (mantém a superior).
create or replace function public.enforce_palpite_lock()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  kickoff timestamptz;
begin
  if tg_op = 'UPDATE' then
    if new.participante_id is distinct from old.participante_id then
      raise exception 'participante_id é imutável após a criação do palpite';
    end if;
    if new.partida_id is distinct from old.partida_id then
      raise exception 'partida_id é imutável após a criação do palpite';
    end if;
  end if;

  -- Apuração: gols inalterados => só pontos/updated_at mudaram. Liberado sem
  -- checar a janela (participante_id e partida_id já validados acima).
  if tg_op = 'UPDATE'
     and new.gols_mandante is not distinct from old.gols_mandante
     and new.gols_visitante is not distinct from old.gols_visitante then
    return new;
  end if;

  select data_hora into kickoff from public.partidas where id = new.partida_id;
  if kickoff is null then
    raise exception 'Partida inexistente';
  end if;

  -- Borda inferior (nova): antes da meia-noite BRT do dia do jogo.
  if now() < public.janela_palpite_inicio(kickoff) then
    raise exception 'palpite_nao_liberado: os palpites deste jogo abrem no dia da partida';
  end if;

  -- Borda superior (existente): apito já dado.
  if now() >= kickoff then
    raise exception 'Palpite encerrado: a partida já começou';
  end if;

  return new;
end;
$$;
