-- =============================================================================
-- Bolão da Copa 2026 — schema inicial
-- Princípio de ouro: o SERVIDOR é a fonte de verdade.
--   - RLS ligado em tudo (deny-by-default).
--   - palpite vira read-only depois do apito (trigger).
--   - coluna `pontos` NUNCA é escrita pelo cliente (só por Edge Function).
-- =============================================================================

-- ------------------------------------------------------------------ profiles
-- 1 linha por usuário autenticado. Criada automaticamente no cadastro.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null default 'Participante',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- Cria o profile assim que o usuário se cadastra (Google ou e-mail).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, nome, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ selecoes
create table public.selecoes (
  id      uuid primary key default gen_random_uuid(),
  nome    text not null,
  codigo  text not null unique   -- ISO de 3 letras, ex.: BRA
);

-- ------------------------------------------------------------------ partidas
create table public.partidas (
  id               uuid primary key default gen_random_uuid(),
  fase             text not null,                    -- grupos | oitavas | ...
  grupo            text,
  data_hora        timestamptz not null,             -- apito inicial (verdade da trava)
  estadio          text not null,
  status           text not null default 'agendada', -- agendada | ao-vivo | encerrada
  mandante_id      uuid not null references public.selecoes (id),
  visitante_id     uuid not null references public.selecoes (id),
  gols_mandante    int,
  gols_visitante   int,
  created_at       timestamptz not null default now()
);

-- -------------------------------------------------------------------- boloes
create table public.boloes (
  id              uuid primary key default gen_random_uuid(),
  nome            text not null,
  organizador_id  uuid not null references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);

-- -------------------------------------------------------------- participantes
create table public.participantes (
  id          uuid primary key default gen_random_uuid(),
  bolao_id    uuid not null references public.boloes (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (bolao_id, user_id)
);

-- ------------------------------------------------------------------- convites
create table public.convites (
  id          uuid primary key default gen_random_uuid(),
  bolao_id    uuid not null references public.boloes (id) on delete cascade,
  token       text not null unique default encode(gen_random_bytes(16), 'hex'),
  expira_em   timestamptz,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- palpites
create table public.palpites (
  id               uuid primary key default gen_random_uuid(),
  participante_id  uuid not null references public.participantes (id) on delete cascade,
  partida_id       uuid not null references public.partidas (id) on delete cascade,
  gols_mandante    int not null,
  gols_visitante   int not null,
  pontos           int,                              -- só o servidor escreve
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (participante_id, partida_id)
);

-- ===================================================================== TRAVA
-- Palpite só pode ser criado/alterado ANTES do apito. now() é do servidor.
-- A apuração (que mexe só em `pontos`, sem tocar nos gols) passa livre.
create or replace function public.enforce_palpite_lock()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  kickoff timestamptz;
begin
  if tg_op = 'UPDATE'
     and new.gols_mandante is not distinct from old.gols_mandante
     and new.gols_visitante is not distinct from old.gols_visitante then
    return new; -- apuração mexendo em pontos: liberado
  end if;

  select data_hora into kickoff from public.partidas where id = new.partida_id;
  if kickoff is null then
    raise exception 'Partida inexistente';
  end if;
  if now() >= kickoff then
    raise exception 'Palpite encerrado: a partida já começou';
  end if;
  return new;
end;
$$;

create trigger trg_palpite_lock
  before insert or update on public.palpites
  for each row execute function public.enforce_palpite_lock();

-- ======================================================================= RLS
alter table public.profiles      enable row level security;
alter table public.selecoes      enable row level security;
alter table public.partidas      enable row level security;
alter table public.boloes        enable row level security;
alter table public.participantes enable row level security;
alter table public.convites      enable row level security;
alter table public.palpites      enable row level security;

-- profiles: todo mundo autenticado lê (nomes no ranking); só edita o próprio.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- selecoes e partidas: dados públicos do torneio (leitura liberada).
create policy "selecoes_select" on public.selecoes
  for select to authenticated using (true);
create policy "partidas_select" on public.partidas
  for select to authenticated using (true);
-- (escrita em selecoes/partidas só via service_role — sem policy = negado)

-- boloes: vê quem é organizador ou participante. Cria quem for o organizador.
create policy "boloes_select" on public.boloes
  for select to authenticated using (
    organizador_id = auth.uid()
    or exists (
      select 1 from public.participantes p
      where p.bolao_id = boloes.id and p.user_id = auth.uid()
    )
  );
create policy "boloes_insert_own" on public.boloes
  for insert to authenticated with check (organizador_id = auth.uid());

-- participantes: vê os do bolão em que você está; entra como você mesmo.
create policy "participantes_select" on public.participantes
  for select to authenticated using (
    exists (
      select 1 from public.participantes meu
      where meu.bolao_id = participantes.bolao_id and meu.user_id = auth.uid()
    )
  );
create policy "participantes_insert_self" on public.participantes
  for insert to authenticated with check (user_id = auth.uid());

-- convites: vê/gera o organizador do bolão.
create policy "convites_select" on public.convites
  for select to authenticated using (
    exists (
      select 1 from public.boloes b
      where b.id = convites.bolao_id and b.organizador_id = auth.uid()
    )
  );
create policy "convites_insert" on public.convites
  for insert to authenticated with check (
    exists (
      select 1 from public.boloes b
      where b.id = convites.bolao_id and b.organizador_id = auth.uid()
    )
  );

-- palpites: o seu, sempre. O dos outros, só DEPOIS do apito (anti-cola).
create policy "palpites_select" on public.palpites
  for select to authenticated using (
    exists (
      select 1 from public.participantes p
      where p.id = palpites.participante_id and p.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.partidas pa
      where pa.id = palpites.partida_id and now() >= pa.data_hora
    )
  );
create policy "palpites_insert_own" on public.palpites
  for insert to authenticated with check (
    exists (
      select 1 from public.participantes p
      where p.id = palpites.participante_id and p.user_id = auth.uid()
    )
  );
create policy "palpites_update_own" on public.palpites
  for update to authenticated using (
    exists (
      select 1 from public.participantes p
      where p.id = palpites.participante_id and p.user_id = auth.uid()
    )
  );

-- `pontos` é blindado: cliente não pode inserir nem atualizar essa coluna.
-- (service_role, usado pela apuração, ignora estes grants.)
revoke insert, update on table public.palpites from authenticated;
grant insert (participante_id, partida_id, gols_mandante, gols_visitante)
  on table public.palpites to authenticated;
grant update (gols_mandante, gols_visitante, updated_at)
  on table public.palpites to authenticated;
