-- =============================================================================
-- 0018 — M-1: esconde is_admin da leitura geral
--
-- `is_admin` era SELECT-ável por qualquer authenticated (profiles_select com
-- using(true) + grant de select em todas as colunas), permitindo enumerar quais
-- contas são admin (alvo de phishing). Restringe o select às colunas públicas e
-- move a checagem de admin para uma função SECURITY DEFINER — usada na policy de
-- partidas e no front (RPC) — pra ninguém precisar ler a coluna diretamente.
-- =============================================================================

create or replace function public.eh_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = uid), false);
$$;

grant execute on function public.eh_admin(uuid) to authenticated;

-- Recria a policy de update de partidas usando eh_admin() — assim ela não
-- depende de o chamador conseguir ler a coluna is_admin.
drop policy if exists "partidas_update_admin" on public.partidas;
create policy "partidas_update_admin" on public.partidas
  for update to authenticated
  using (public.eh_admin())
  with check (public.eh_admin());

-- authenticated passa a ler só as colunas públicas de profiles (sem is_admin).
revoke select on table public.profiles from authenticated;
grant select (id, nome, avatar_url, created_at) on table public.profiles to authenticated;
