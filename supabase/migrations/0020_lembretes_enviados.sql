-- Lembretes diários enviados: 1 por participante por dia (anti-duplicata).
-- Escrita só pelo service_role (GitHub Actions). Invisível ao app (RLS sem policy).
create table if not exists public.lembretes_enviados (
  data            date not null,
  participante_id uuid not null references public.participantes (id) on delete cascade,
  enviado_em      timestamptz not null default now(),
  primary key (data, participante_id)
);

alter table public.lembretes_enviados enable row level security;

-- Grant explícito (padrão dos consertos 0008-0010 — grants não-confiáveis por default).
grant select, insert on public.lembretes_enviados to service_role;
