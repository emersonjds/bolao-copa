-- =============================================================================
-- 0023 — fecha a enumeração de admins via eh_admin(uuid)
--
-- A 0018 escondeu a coluna is_admin, mas eh_admin(uid uuid default auth.uid())
-- ficou grantada a authenticated com PARÂMETRO LIVRE. Como profiles_select usa
-- using(true), qualquer logado lista os UUIDs e pergunta "fulano é admin?" por
-- chamada, reconstituindo o vetor que a 0018 quis fechar (alvo de phishing).
-- Aqui a função exposta ao cliente passa a NÃO aceitar uid externo — checa
-- apenas o próprio auth.uid(). O app já chama rpc("eh_admin") sem argumento.
-- =============================================================================

-- A policy de update de partidas depende de eh_admin(); dropa antes do swap.
drop policy if exists "partidas_update_admin" on public.partidas;
drop function if exists public.eh_admin(uuid);

create or replace function public.eh_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to authenticated;

create policy "partidas_update_admin" on public.partidas
  for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());
