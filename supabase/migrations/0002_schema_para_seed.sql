-- =============================================================================
-- 0002 — ajustes de schema para a carga do calendário oficial (seed)
--   - mata-mata entra com seleções indefinidas (placeholders "2A", "W74"):
--     FKs viram nuláveis e ganham rótulo de exibição.
--   - bolão padrão único (organizador opcional) para auto-inscrição no login.
-- =============================================================================

-- Mata-mata ainda não tem seleção definida no momento do seed.
alter table public.partidas alter column mandante_id  drop not null;
alter table public.partidas alter column visitante_id drop not null;

-- Rótulo exibido enquanto a seleção real não existe (ex.: "2A", "Vencedor Grupo A").
alter table public.partidas add column mandante_label  text;
alter table public.partidas add column visitante_label text;

-- Quem avançou nos pênaltis (mata-mata) — só exibição, não afeta pontos.
alter table public.partidas
  add column vencedor_penaltis uuid references public.selecoes (id);

-- Bolão padrão: organizador opcional (o bolão "da casa" não tem dono humano).
alter table public.boloes alter column organizador_id drop not null;

-- O bolão único, com id fixo e conhecido (usado na auto-inscrição do Plano 2).
insert into public.boloes (id, nome, organizador_id)
values ('00000000-0000-0000-0000-000000000b01', 'Bolão da Galera', null)
on conflict (id) do nothing;
