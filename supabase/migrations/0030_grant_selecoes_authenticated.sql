-- =============================================================================
-- 0030 — grant de leitura de selecoes para authenticated
--
-- A policy RLS "selecoes_select" (0001) já libera SELECT para authenticated,
-- mas o GRANT de leitura só foi concedido a anon (0005). Como grant + policy
-- são AMBOS obrigatórios (ver comentário na 0005), num banco recém-resetado o
-- usuário logado leva "permission denied for table selecoes" — quebrando
-- qualquer tela que lê seleções logado (palpites, calendário, chaveamento).
-- Mesmo conserto de grant ausente já feito em 0008/0010 para palpites/partidas.
-- =============================================================================

grant select on public.selecoes to authenticated;
