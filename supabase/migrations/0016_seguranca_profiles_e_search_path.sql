-- =============================================================================
-- 0016 — hardening de segurança
--
-- C-1 (CRÍTICO): o default privilege do Supabase concede UPDATE de TODAS as
-- colunas de `profiles` a `authenticated`. Com a policy `profiles_update_own`
-- (id = auth.uid()), qualquer usuário logado podia se auto-promover a admin via
-- `PATCH /profiles {is_admin:true}` e, sendo admin, adulterar placares de
-- partidas encerradas (policy `partidas_update_admin` da 0005) — fraudando o
-- ranking. Mesmo problema que a 0010 corrigiu para `partidas`.
-- Aqui alinhamos os GRANTs à intenção: o usuário edita só nome e avatar_url;
-- `is_admin` passa a ser exclusivo do service_role (que ignora estes grants).
-- =============================================================================

revoke update on table public.profiles from authenticated;
grant update (nome, avatar_url) on table public.profiles to authenticated;

-- =============================================================================
-- M-2: padroniza `set search_path` nas duas funções que ficaram sem ele
-- (defense-in-depth contra hijack de search_path; alinha ao resto do schema).
-- =============================================================================

create or replace function public.peso_fase(fase text)
returns int
language sql
immutable
set search_path = public, pg_temp
as $$
  select case fase
    when 'oitavas' then 2
    when 'quartas' then 2
    when 'semifinal' then 3
    when 'final' then 3
    else 1 -- grupos, trinta-e-dois, terceiro-lugar
  end;
$$;

create or replace function public.bump_palpite_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.gols_mandante is distinct from old.gols_mandante
     or new.gols_visitante is distinct from old.gols_visitante then
    new.updated_at = now();
  end if;
  return new;
end;
$$;
