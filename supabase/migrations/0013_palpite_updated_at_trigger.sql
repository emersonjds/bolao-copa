-- Follow-up: `updated_at` era coluna morta na edição. O app salva palpite via
-- upsert sem enviar updated_at no payload, então, sem trigger, editar um palpite
-- mantinha updated_at = momento da criação (auditabilidade enganosa).
--
-- Este trigger bumpa updated_at = now() APENAS quando os gols mudam — ou seja,
-- numa edição real do usuário. A apuração (que mexe só em `pontos`, gols
-- inalterados) NÃO bumpa, preservando o sentido de "última edição do palpiteiro".

create or replace function public.bump_palpite_updated_at()
returns trigger
language plpgsql
as $$
begin
  if new.gols_mandante is distinct from old.gols_mandante
     or new.gols_visitante is distinct from old.gols_visitante then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- Nome com sufixo "_zz" garante execução DEPOIS de trg_palpite_lock (triggers
-- BEFORE rodam em ordem alfabética): a trava valida primeiro, o bump por último.
drop trigger if exists trg_palpite_updated_at_zz on public.palpites;
create trigger trg_palpite_updated_at_zz
  before update on public.palpites
  for each row execute function public.bump_palpite_updated_at();
