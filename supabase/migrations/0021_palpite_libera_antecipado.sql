-- Libera palpite antecipado: remove a BORDA INFERIOR da janela (a regra "dia a
-- dia" da 0019, que só aceitava palpite a partir da meia-noite BRT do dia do
-- jogo). Agora o palpite é aceito a QUALQUER momento antes do apito.
--
-- Motivo: participantes querem deixar palpites prontos com antecedência; a trava
-- inferior fazia o app recusar (palpite_nao_liberado) e os palpites se perdiam.
-- A organização "hoje + amanhã" continua, mas só como apresentação no cliente —
-- não é mais regra do servidor.
--
-- Mantém: imutabilidade de participante_id/partida_id, o bypass da apuração
-- (gols inalterados) e a BORDA SUPERIOR (trava no apito). A função
-- janela_palpite_inicio / coluna janela_inicio seguem existindo (o cliente usa
-- para agrupar os jogos por dia).

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

  -- Borda superior (mantida): apito já dado.
  if now() >= kickoff then
    raise exception 'Palpite encerrado: a partida já começou';
  end if;

  return new;
end;
$$;
