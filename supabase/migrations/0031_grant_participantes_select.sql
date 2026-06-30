-- =============================================================================
-- 0031 — grants ausentes após db reset
--
-- Supabase cloud concede ALL PRIVILEGES ao service_role em todas as tabelas por
-- padrão. No Supabase local esses grants precisam ser explícitos — após cada
-- db reset o service_role ficava sem acesso, quebrando scenario:seed e o backup.
-- authenticated também faltava SELECT em partidas e participantes (policies RLS
-- existem desde 0001, mas os GRANTs correspondentes nunca foram emitidos).
-- Mesmo padrão de conserto já aplicado em 0008/0009/0010/0028/0030.
-- =============================================================================

-- service_role: acesso total no schema (espelha o comportamento do Supabase cloud).
-- RLS permanece o portão de segurança para authenticated/anon; service_role
-- ignora RLS por configuração do PostgREST — esses grants são necessários só
-- para contornar a camada de object privileges do Postgres local.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- authenticated: GRANTs de SELECT ausentes em partidas e participantes.
-- As policies RLS "partidas_select" e "participantes_select" (0001) já existem;
-- sem o GRANT a base não chega a avaliar a policy — falha com permission denied.
grant select on public.partidas to authenticated;
grant select on public.participantes to authenticated;
