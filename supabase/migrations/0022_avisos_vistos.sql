-- Avisos (novidades) já vistos por usuário: um modal informativo aparece uma
-- vez por aviso_id e some ao ser fechado. Persistência por conta (cross-device);
-- visitante anônimo usa localStorage no cliente (não passa por aqui).
create table if not exists public.avisos_vistos (
  user_id  uuid not null references auth.users (id) on delete cascade,
  aviso_id text not null,
  visto_em timestamptz not null default now(),
  primary key (user_id, aviso_id)
);

alter table public.avisos_vistos enable row level security;

-- O usuário lê e marca apenas os próprios avisos.
create policy "avisos_vistos_select_own" on public.avisos_vistos
  for select to authenticated using (user_id = auth.uid());
create policy "avisos_vistos_insert_own" on public.avisos_vistos
  for insert to authenticated with check (user_id = auth.uid());

-- Grant explícito (padrão dos consertos 0008-0010 — grants não-confiáveis por default).
grant select, insert on public.avisos_vistos to authenticated;
