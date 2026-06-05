-- 0007_fix_participantes_rls_recursion.sql
-- BUG (Postgres 42P17): a policy "participantes_select" da 0001 fazia um
-- `select ... from participantes` DENTRO da própria regra de participantes,
-- causando recursão infinita quando a role autenticada lê a tabela (o app).
-- O service_role (DBeaver/Table Editor) não dispara RLS, por isso o bug ficou
-- latente até o app consultar `participantes` direto (useMeuParticipanteId).
--
-- Correção: mover a checagem de "sou participante deste bolão?" para uma função
-- SECURITY DEFINER, que roda como dono (sem RLS) e por isso NÃO recursa.
-- Isso também quebra a recursão indireta em boloes_select e palpites_select,
-- que fazem subselect em participantes.

create or replace function public.eh_participante(p_bolao uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.participantes
    where bolao_id = p_bolao
      and user_id = auth.uid()
  );
$$;

grant execute on function public.eh_participante(uuid) to authenticated;

drop policy if exists "participantes_select" on public.participantes;

create policy "participantes_select" on public.participantes
  for select to authenticated
  using (public.eh_participante(bolao_id));
