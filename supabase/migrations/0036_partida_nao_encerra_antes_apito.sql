-- =============================================================================
-- 0036 — trava: partida não pode ser encerrada nem receber placar antes do apito
--
-- Motivo: o painel admin faz UPDATE direto em partidas. Nada impedia marcar
-- 'encerrada' com placar ANTES de data_hora, o que (a) sumia o jogo da tela de
-- palpite, (b) apurava pontos com resultado inexistente e (c) avançava o
-- "vencedor" no mata-mata. Esta trava fecha a classe na origem: antes do apito
-- (now() < data_hora), a partida tem de seguir 'agendada' e sem gols.
--
-- Só no UPDATE: o caminho que causou o bug é o admin editando um jogo já
-- existente (RLS só permite UPDATE em partidas; INSERT é service_role/seed, que
-- legitimamente carrega jogos passados encerrados). Guardar INSERT não protege
-- contra o bug e atritaria com seeds/carga histórica.
--
-- Não é SECURITY DEFINER: não acessa outra tabela, só valida NEW. search_path
-- fixo por consistência com o hardening do projeto.
-- =============================================================================

create or replace function public.enforce_partida_nao_encerra_antes_apito()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if now() < new.data_hora
     and (new.status <> 'agendada'
          or new.gols_mandante is not null
          or new.gols_visitante is not null) then
    raise exception
      'Partida ainda não começou (apito %): não é possível lançar placar ou encerrar antes do início.',
      new.data_hora;
  end if;
  return new;
end;
$$;

create trigger trg_partida_nao_encerra_antes_apito
  before update on public.partidas
  for each row
  execute function public.enforce_partida_nao_encerra_antes_apito();
